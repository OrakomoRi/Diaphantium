import { shallowRef, type Directive } from 'vue';
import type { TooltipSide } from './placement';

export interface TooltipOptions {
	content: string | null | undefined;
	kbd?: string | string[];
	side?: TooltipSide;
	tone?: 'default' | 'danger';
}

export type TooltipValue = string | null | undefined | TooltipOptions;

export interface ResolvedTooltip {
	content: string;
	kbd: string[];
	side: TooltipSide;
	tone: 'default' | 'danger';
}

export interface TooltipTrigger {
	el: HTMLElement;
	options: ResolvedTooltip | null;
	suppressed: boolean;
	off: () => void;
}

export interface ActiveTooltip {
	trigger: TooltipTrigger;
	options: ResolvedTooltip;
	warm: boolean;
}

export const TOOLTIP_TIMING = {
	openDelay: 450,
	skipWindow: 300,
	closeGrace: 100,
} as const;

export const activeTooltip = shallowRef<ActiveTooltip | null>(null);

const triggers = new WeakMap<HTMLElement, TooltipTrigger>();
let pending: TooltipTrigger | null = null;
let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let lastClosedAt = -Infinity;

export function resolveTooltip(value: TooltipValue): ResolvedTooltip | null {
	const options = typeof value === 'object' && value !== null ? value : { content: value };
	const content = options.content?.trim();
	if (!content) return null;
	return {
		content,
		kbd: options.kbd === undefined ? [] : [options.kbd].flat(),
		side: options.side ?? 'top',
		tone: options.tone ?? 'default',
	};
}

function innermost(el: HTMLElement, target: EventTarget | null): boolean {
	for (let node = target instanceof Element ? target : null; node && node !== el; node = node.parentElement) {
		if (node instanceof HTMLElement && triggers.has(node)) return false;
	}
	return true;
}

function clearTimers(): void {
	clearTimeout(openTimer);
	clearTimeout(closeTimer);
	pending = null;
}

function show(trigger: TooltipTrigger, warm: boolean): void {
	pending = null;
	const options = trigger.options;
	if (!options || !trigger.el.isConnected) return;
	const wasShown = activeTooltip.value !== null;
	activeTooltip.value = { trigger, options, warm };
	if (!wasShown) {
		document.addEventListener('keydown', onDocumentKey, true);
		window.addEventListener('blur', hideTooltip);
	}
}

function open(trigger: TooltipTrigger, immediate: boolean): void {
	if (!trigger.options || trigger.suppressed) return;
	clearTimeout(closeTimer);
	const current = activeTooltip.value;
	if (current?.trigger === trigger || pending === trigger) return;
	clearTimeout(openTimer);
	const warm = current !== null || performance.now() - lastClosedAt < TOOLTIP_TIMING.skipWindow;
	if (immediate || warm) {
		show(trigger, warm);
		return;
	}
	pending = trigger;
	openTimer = setTimeout(() => show(trigger, false), TOOLTIP_TIMING.openDelay);
}

function close(trigger: TooltipTrigger, grace: boolean): void {
	if (pending === trigger) {
		clearTimeout(openTimer);
		pending = null;
	}
	if (activeTooltip.value?.trigger !== trigger) return;
	clearTimeout(closeTimer);
	if (grace) closeTimer = setTimeout(hideTooltip, TOOLTIP_TIMING.closeGrace);
	else hideTooltip();
}

export function hideTooltip(): void {
	clearTimers();
	if (!activeTooltip.value) return;
	activeTooltip.value = null;
	lastClosedAt = performance.now();
	document.removeEventListener('keydown', onDocumentKey, true);
	window.removeEventListener('blur', hideTooltip);
}

function onDocumentKey(event: KeyboardEvent): void {
	if (event.key !== 'Escape') return;
	const current = activeTooltip.value;
	if (current) current.trigger.suppressed = true;
	hideTooltip();
}

function describe(el: HTMLElement, options: ResolvedTooltip | null): void {
	const label = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
	if (options && options.content !== label) el.setAttribute('aria-description', options.content);
	else el.removeAttribute('aria-description');
}

function attach(el: HTMLElement, value: TooltipValue): TooltipTrigger {
	const trigger: TooltipTrigger = { el, options: resolveTooltip(value), suppressed: false, off: () => {} };
	describe(el, trigger.options);

	const onPointerEnter = (event: PointerEvent) => {
		if (event.pointerType !== 'touch') open(trigger, false);
	};
	const onPointerMove = (event: PointerEvent) => {
		if (event.pointerType === 'touch' || !innermost(el, event.target)) return;
		if (activeTooltip.value?.trigger !== trigger && pending !== trigger) open(trigger, false);
	};
	const onPointerLeave = () => {
		trigger.suppressed = false;
		close(trigger, true);
	};
	const onPress = () => {
		trigger.suppressed = true;
		close(trigger, false);
	};
	const onFocusIn = (event: FocusEvent) => {
		const target = event.composedPath()[0] ?? null;
		if (innermost(el, target) && target instanceof Element && target.matches(':focus-visible') && !(target instanceof HTMLInputElement)) open(trigger, true);
	};
	const onFocusOut = (event: FocusEvent) => {
		if (el.contains(event.relatedTarget as Node | null)) return;
		close(trigger, false);
	};

	el.addEventListener('pointerenter', onPointerEnter);
	el.addEventListener('pointermove', onPointerMove);
	el.addEventListener('pointerleave', onPointerLeave);
	el.addEventListener('pointerdown', onPress);
	el.addEventListener('click', onPress);
	el.addEventListener('focusin', onFocusIn);
	el.addEventListener('focusout', onFocusOut);
	trigger.off = () => {
		el.removeEventListener('pointerenter', onPointerEnter);
		el.removeEventListener('pointermove', onPointerMove);
		el.removeEventListener('pointerleave', onPointerLeave);
		el.removeEventListener('pointerdown', onPress);
		el.removeEventListener('click', onPress);
		el.removeEventListener('focusin', onFocusIn);
		el.removeEventListener('focusout', onFocusOut);
	};
	return trigger;
}

function sameTooltip(a: ResolvedTooltip, b: ResolvedTooltip): boolean {
	return a.content === b.content && a.side === b.side && a.tone === b.tone && a.kbd.join('\n') === b.kbd.join('\n');
}

function update(trigger: TooltipTrigger, value: TooltipValue): void {
	const options = resolveTooltip(value);
	const previous = trigger.options;
	trigger.options = options;
	describe(trigger.el, options);
	if (activeTooltip.value?.trigger !== trigger) return;
	if (!options) {
		hideTooltip();
		return;
	}
	if (!previous || !sameTooltip(previous, options)) activeTooltip.value = { trigger, options, warm: true };
}

export const vTooltip: Directive<HTMLElement, TooltipValue> = {
	mounted(el, binding) {
		triggers.set(el, attach(el, binding.value));
	},
	updated(el, binding) {
		const trigger = triggers.get(el);
		if (trigger) update(trigger, binding.value);
	},
	beforeUnmount(el) {
		const trigger = triggers.get(el);
		if (!trigger) return;
		trigger.off();
		triggers.delete(el);
		if (pending === trigger) clearTimers();
		if (activeTooltip.value?.trigger === trigger) hideTooltip();
	},
};

declare module 'vue' {
	interface GlobalDirectives {
		vTooltip: typeof vTooltip;
	}
}
