<script lang="ts">
export type PresenceState = 'opening' | 'open' | 'closing';
</script>

<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import { animate, cancelFrame, frame, motionValue, type AnimationPlaybackControlsWithThen, type MotionValue } from 'motion';
import { getStorage, setStorage } from '../storage/storage';
import { openMenuCode } from '../core/hotkeys';
import { anchorFromPlacement, attachDrag, placementFromAnchor, readAnchor, viewportSize, type Anchor, type Placement, type Size } from '../core/position';
import { PANEL_SHELL, providePanelState, type DialogKeyHandler } from './model/panel';
import { supplyKeyFromCode } from './model/supplyIcons';
import { isThemeId, saveThemeId, storedThemeId, type ThemeId } from './model/theme';
import { prefersReducedMotion } from './motion/springs';
import { CONTENT_RISE, THEME_SWITCH_SECONDS, mixShape, surfaceTransform, switchPhases, type Shape } from './motion/themeMorph';
import { hideTooltip } from './tooltip/tooltip';
import { deepActiveElement } from './dom';
import { themeById } from './themes';
import ThemeLayer from './ThemeLayer.vue';
import type { Theme } from './themes/types';

const DEFAULT_ANCHOR: Anchor = { ax: 'left', x: 100, ay: 'top', y: 100 };
const NAVIGATION_KEYS = new Set(['Tab', 'Enter', 'NumpadEnter', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

interface Layer {
	key: number;
	theme: Theme;
	host: HTMLElement | null;
}

interface MorphSide {
	layer: Layer;
	width: number;
	height: number;
	radius: number;
}

interface ThemeSwitch {
	from: MorphSide;
	to: MorphSide;
	progress: MotionValue<number>;
	animation: AnimationPlaybackControlsWithThen | null;
	stopListening: () => void;
	observer: ResizeObserver;
}

const props = defineProps<{ presence: MotionValue<number>; state: PresenceState }>();

const emit = defineEmits<{ close: []; toggle: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);
const positioner = ref<HTMLElement | null>(null);
const dragging = ref(false);
const closing = computed(() => props.state === 'closing');
const selected = ref<ThemeId>(storedThemeId());
const layers = shallowRef<Layer[]>([]);
const interactiveKey = ref<number | null>(null);
const selectedTheme = computed(() => themeById(selected.value));
const viewportHeight = ref(viewportSize().height);

const keyHandlers = new Set<DialogKeyHandler>();
let nextKey = 0;

providePanelState();

provide(PANEL_SHELL, {
	presence: props.presence,
	closing,
	dragging,
	theme: selected,
	viewportHeight,
	close: () => emit('close'),
	selectTheme,
	releasePointerFocus,
	onKey(handler) {
		keyHandlers.add(handler);
		return () => keyHandlers.delete(handler);
	},
});

let anchor = readAnchor(getStorage('coordinates'), DEFAULT_ANCHOR);
let placement: Placement = { left: 0, top: 0 };
let dragStart: Placement | null = null;
let resizeFrame = 0;
let detach: (() => void) | null = null;
let focusFromPointer = false;
let themeSwitch: ThemeSwitch | null = null;

function size(): Size {
	const element = positioner.value;
	return { width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
}

function applyPlacement(next: Placement): void {
	placement = next;
	if (positioner.value) {
		positioner.value.style.transform = `translate3d(${Math.round(next.left)}px, ${Math.round(next.top)}px, 0)`;
	}
}

function relayout(): void {
	viewportHeight.value = viewportSize().height;
	if (dragStart) return;
	const current = size();
	if (current.width === 0) return;
	applyPlacement(placementFromAnchor(anchor, current));
	if (themeSwitch) frame.render(renderSwitch);
}

function onWindowResize(): void {
	cancelAnimationFrame(resizeFrame);
	resizeFrame = requestAnimationFrame(relayout);
}

function commitDrag(end: Placement): void {
	const start = dragStart;
	dragStart = null;
	dragging.value = false;
	applyPlacement(end);
	if (!start || (start.left === end.left && start.top === end.top)) return;

	anchor = anchorFromPlacement(end, size());
	setStorage('coordinates', { top: Math.round(end.top), left: Math.round(end.left), anchor });
}

function createLayer(theme: Theme): Layer {
	return markRaw({ key: nextKey++, theme, host: null });
}

function setHost(layer: Layer, instance: unknown): void {
	layer.host = (instance as { host?: HTMLElement | null } | null)?.host ?? null;
}

function morphParts(host: HTMLElement | null, part: 'surface' | 'content'): HTMLElement[] {
	return [...(host?.shadowRoot?.querySelectorAll<HTMLElement>(`[data-morph="${part}"]`) ?? [])];
}

function measureSide(layer: Layer): MorphSide {
	const surface = morphParts(layer.host, 'surface')[0];
	return {
		layer,
		width: layer.host?.offsetWidth ?? 0,
		height: layer.host?.offsetHeight ?? 0,
		radius: surface ? parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 0 : 0,
	};
}

function measureSizes(current: ThemeSwitch): void {
	for (const side of [current.from, current.to]) {
		side.width = side.layer.host?.offsetWidth ?? side.width;
		side.height = side.layer.host?.offsetHeight ?? side.height;
	}
}

function paintLayer(side: MorphSide, own: Shape, shape: Shape, surfaceOpacity: number, contentOpacity: number, rise: number): void {
	const { transform, borderRadius } = surfaceTransform(shape, own);
	for (const surface of morphParts(side.layer.host, 'surface')) {
		surface.style.transformOrigin = '0 0';
		surface.style.transform = transform;
		surface.style.borderRadius = borderRadius;
		surface.style.opacity = String(surfaceOpacity);
	}
	for (const content of morphParts(side.layer.host, 'content')) {
		content.style.opacity = String(contentOpacity);
		content.style.transform = rise > 0 ? `translate3d(0, ${rise}px, 0)` : '';
	}
}

function clearLayer(layer: Layer): void {
	if (layer.host) layer.host.style.transform = '';
	for (const surface of morphParts(layer.host, 'surface')) {
		surface.style.transformOrigin = '';
		surface.style.transform = '';
		surface.style.borderRadius = '';
		surface.style.opacity = '';
	}
	for (const content of morphParts(layer.host, 'content')) {
		content.style.opacity = '';
		content.style.transform = '';
	}
}

function renderSwitch(): void {
	const current = themeSwitch;
	const incomingHost = current?.to.layer.host;
	if (!current || !incomingHost || current.from.width === 0 || current.to.width === 0) return;
	const { from, to } = current;
	const phases = switchPhases(current.progress.get());
	const target = placementFromAnchor(anchor, { width: to.width, height: to.height });
	const fromShape: Shape = { x: 0, y: 0, width: from.width, height: from.height, radius: from.radius };
	const toShape: Shape = { x: target.left - placement.left, y: target.top - placement.top, width: to.width, height: to.height, radius: to.radius };
	const shape = mixShape(fromShape, toShape, phases.morph);

	incomingHost.style.transform = `translate3d(${toShape.x}px, ${toShape.y}px, 0)`;
	paintLayer(from, fromShape, shape, phases.outgoingSurface, phases.outgoingContent, 0);
	paintLayer(to, toShape, shape, phases.incomingSurface, phases.incomingContent, (1 - phases.incomingContent) * CONTENT_RISE);

	const interactive = selected.value === to.layer.theme.id
		? (phases.incomingContent >= 0.5 ? to.layer.key : null)
		: (phases.outgoingContent >= 0.5 ? from.layer.key : null);
	if (interactiveKey.value !== interactive) interactiveKey.value = interactive;
}

function finishSwitch(keep: Layer): void {
	const current = themeSwitch;
	themeSwitch = null;
	if (current) {
		current.animation?.stop();
		current.stopListening();
		current.observer.disconnect();
		current.progress.destroy();
		cancelFrame(renderSwitch);
	}
	layers.value = [keep];
	interactiveKey.value = keep.key;
	nextTick(() => {
		clearLayer(keep);
		relayout();
	});
}

function runSwitch(target: 0 | 1): void {
	const current = themeSwitch;
	if (!current) return;
	current.animation?.stop();
	const seconds = prefersReducedMotion() ? 0 : THEME_SWITCH_SECONDS * Math.abs(target - current.progress.get());
	const animation = animate(current.progress, target, { duration: seconds, ease: 'linear' });
	current.animation = animation;
	animation.then(() => {
		if (themeSwitch !== current || current.animation !== animation) return;
		finishSwitch(target === 1 ? current.to.layer : current.from.layer);
	});
}

function startSwitch(id: ThemeId): void {
	const base = layers.value[0];
	if (!base) return;
	const incoming = createLayer(themeById(id));
	layers.value = [base, incoming];
	interactiveKey.value = null;

	nextTick(() => {
		if (layers.value[1] !== incoming || !base.host || !incoming.host) return;
		const progress = motionValue(0);
		const current: ThemeSwitch = {
			from: measureSide(base),
			to: measureSide(incoming),
			progress,
			animation: null,
			stopListening: progress.on('change', () => frame.render(renderSwitch)),
			observer: new ResizeObserver(() => {
				measureSizes(current);
				frame.render(renderSwitch);
			}),
		};
		themeSwitch = current;
		current.observer.observe(base.host);
		current.observer.observe(incoming.host);
		renderSwitch();
		runSwitch(1);
	});
}

function selectTheme(id: string): void {
	if (!isThemeId(id) || id === selected.value || props.state !== 'open' || dragStart) return;
	const current = themeSwitch;
	if (!current && layers.value.length > 1) return;

	dialog.value?.focus({ preventScroll: true });
	hideTooltip();
	selected.value = id;
	saveThemeId(id);

	if (current?.from.layer.theme.id === id) {
		runSwitch(0);
		return;
	}
	if (current?.to.layer.theme.id === id) {
		runSwitch(1);
		return;
	}
	if (current) {
		finishSwitch(current.to.layer);
		nextTick(() => startSwitch(id));
		return;
	}
	startSwitch(id);
}

function attach(element: HTMLElement): () => void {
	window.addEventListener('resize', onWindowResize);
	const observer = new ResizeObserver(relayout);
	observer.observe(element);

	const detachDrag = attachDrag(element, {
		canStart: () => layers.value.length === 1,
		onStart: () => {
			dragStart = placement;
			dragging.value = true;
		},
		current: () => placement,
		size,
		onMove: applyPlacement,
		onEnd: commitDrag,
	});

	return () => {
		detachDrag();
		observer.disconnect();
		window.removeEventListener('resize', onWindowResize);
		cancelAnimationFrame(resizeFrame);
	};
}

function releasePointerFocus(): void {
	const layer = dialog.value;
	if (!layer || !focusFromPointer) return;
	const active = deepActiveElement(layer);
	if (!active || active === layer || (active instanceof HTMLInputElement && active.type === 'text')) return;
	layer.focus({ preventScroll: true });
}

function onPanelPress(event: PointerEvent): void {
	focusFromPointer = true;
	const active = positioner.value ? deepActiveElement(positioner.value) : null;
	if (active instanceof HTMLInputElement && !event.composedPath().includes(active)) active.blur();
}

function keepFocusInside(event: FocusEvent): void {
	if (event.relatedTarget) return;
	queueMicrotask(() => {
		const layer = dialog.value;
		if (!layer?.isConnected) return;
		const active = deepActiveElement(layer);
		if (!active || !composedContains(layer, active)) layer.focus({ preventScroll: true });
	});
}

function composedContains(container: Element, element: Element): boolean {
	let node: Element | null = element;
	while (node) {
		if (container.contains(node)) return true;
		const root = node.getRootNode();
		node = root instanceof ShadowRoot ? root.host : null;
	}
	return false;
}

function onDialogClick(event: MouseEvent): void {
	if (event.target === dialog.value) emit('close');
}

function onDialogKeydown(event: KeyboardEvent): void {
	if (NAVIGATION_KEYS.has(event.code)) focusFromPointer = false;
	if (event.defaultPrevented) {
		event.stopPropagation();
		return;
	}
	if (!NAVIGATION_KEYS.has(event.code)) releasePointerFocus();
	if (event.composedPath()[0] instanceof HTMLInputElement) {
		event.stopPropagation();
		return;
	}
	if (event.code === openMenuCode()) {
		event.preventDefault();
		event.stopPropagation();
		emit('toggle');
		return;
	}
	if (props.state === 'closing' || event.ctrlKey || event.altKey || event.metaKey) return;
	let consumed = supplyKeyFromCode(event.code) !== null;
	for (const handler of keyHandlers) {
		if (handler(event)) {
			consumed = true;
			break;
		}
	}
	if (consumed) {
		event.preventDefault();
		event.stopPropagation();
	}
}

function onDialogKeyup(event: KeyboardEvent): void {
	if (event.composedPath()[0] instanceof HTMLInputElement) event.stopPropagation();
}

const initialLayer = createLayer(selectedTheme.value);
layers.value = [initialLayer];
interactiveKey.value = initialLayer.key;

watch(closing, isClosing => {
	if (!isClosing || layers.value.length < 2) return;
	const keep = layers.value.find(layer => layer.theme.id === selected.value) ?? layers.value[0];
	if (keep) finishSwitch(keep);
});

onMounted(() => {
	const layer = dialog.value;
	const element = positioner.value;
	if (!layer || !element) return;

	if (!layer.open) layer.showModal();
	layer.focus({ preventScroll: true });

	relayout();
	detach = attach(element);
});

onBeforeUnmount(() => {
	detach?.();
	detach = null;
	const current = themeSwitch;
	themeSwitch = null;
	if (current) {
		current.animation?.stop();
		current.stopListening();
		current.observer.disconnect();
		current.progress.destroy();
	}
	cancelFrame(renderSwitch);
});
</script>

<template>
	<dialog
		ref="dialog"
		class="popup"
		tabindex="-1"
		aria-label="Diaphantium"
		:data-state="state"
		:data-theme="selected"
		@cancel.prevent="emit('close')"
		@close="emit('close')"
		@click.stop="onDialogClick"
		@keydown="onDialogKeydown"
		@focusout="keepFocusInside"
		@keyup="onDialogKeyup"
		@pointerdown.stop
		@pointermove.stop
		@pointerup.stop
		@pointercancel.stop
		@mousedown.stop
		@mousemove.stop
		@mouseup.stop
		@dblclick.stop
		@auxclick.stop
		@contextmenu.stop
		@wheel.stop.passive
		@touchstart.stop.passive
		@touchmove.stop.passive
		@touchend.stop
		@touchcancel.stop
	>
		<div ref="positioner" class="popup__positioner" :data-dragging="dragging || undefined" @pointerdown.capture="onPanelPress">
			<ThemeLayer
				v-for="(layer, index) in layers"
				:key="layer.key"
				:ref="instance => setHost(layer, instance)"
				:theme="layer.theme"
				part="panel"
				:overlay="index > 0"
				:active="layer.key === interactiveKey"
			/>
		</div>
		<ThemeLayer :key="selected" :theme="selectedTheme" part="tooltip" />
	</dialog>
</template>
