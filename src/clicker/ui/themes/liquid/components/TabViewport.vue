<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { cancelFrame, frame, motionValue, type MotionValue } from 'motion';
import { TAB_NAMES, useVisiblePanelTabs, type TabName } from '../../../model/panel';
import { useStackCap } from '../../../model/stackCap';
import { clamp, smoothstep, toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const OFFSET = 28;

const props = defineProps<{ active: TabName }>();

interface Pane {
	element: HTMLElement;
	x: MotionValue<number>;
	shown: MotionValue<number>;
	height: number;
	render: () => void;
	stops: VoidFunction[];
}

const root = ref<HTMLElement | null>(null);
const panes = new Map<TabName, Pane>();
let observer: ResizeObserver | null = null;
let sized = false;
let target = -1;

const cap = useStackCap(root);
const visibleNames = useVisiblePanelTabs();

const values = useMotionValues({ height: 0 }, () => {
	if (root.value && sized) root.value.style.height = `${values.height.get()}px`;
});

function unregister(name: TabName): void {
	const pane = panes.get(name);
	if (!pane) return;
	observer?.unobserve(pane.element);
	pane.stops.forEach(stop => stop());
	cancelFrame(pane.render);
	pane.x.destroy();
	pane.shown.destroy();
	panes.delete(name);
}

function register(name: TabName, element: unknown): void {
	if (!(element instanceof HTMLElement)) {
		unregister(name);
		return;
	}
	if (panes.has(name)) return;
	const active = name === props.active;
	const pane: Pane = { element, x: motionValue(0), shown: motionValue(active ? 1 : 0), height: 0, render: () => {}, stops: [] };
	pane.render = () => {
		const shown = clamp(pane.shown.get(), 0, 1);
		element.style.opacity = shown >= 1 ? '' : String(smoothstep((shown - 0.5) / 0.5));
		const x = pane.x.get();
		element.style.transform = Math.abs(x) < 0.01 ? '' : `translate3d(${x}px, 0, 0)`;
		element.style.visibility = shown <= 0.01 && element.inert ? 'hidden' : '';
	};
	const schedule = () => frame.render(pane.render);
	pane.stops.push(pane.x.on('change', schedule), pane.shown.on('change', schedule));
	element.inert = !active;
	panes.set(name, pane);
	pane.render();
	observer?.observe(element);
}

function fit(pane: Pane): void {
	if (pane.height <= 0) return;
	if (!sized) {
		sized = true;
		target = pane.height;
		values.height.jump(pane.height);
		if (root.value) root.value.style.height = `${pane.height}px`;
		return;
	}
	if (pane.height === target) return;
	target = pane.height;
	toValue(values.height, pane.height, SPRINGS.soft);
}

watch(() => props.active, (next, previous) => {
	const incoming = panes.get(next);
	const outgoing = panes.get(previous);
	if (!incoming) return;
	const direction = TAB_NAMES.indexOf(next) >= TAB_NAMES.indexOf(previous) ? 1 : -1;
	if (outgoing && outgoing !== incoming) {
		outgoing.element.inert = true;
		toValue(outgoing.x, -direction * OFFSET, SPRINGS.soft);
		toValue(outgoing.shown, 0, SPRINGS.fade);
	}
	incoming.element.inert = false;
	if (incoming.shown.get() <= 0.01) incoming.x.jump(direction * OFFSET);
	incoming.render();
	toValue(incoming.x, 0, SPRINGS.soft);
	toValue(incoming.shown, 1, SPRINGS.fade);
	fit(incoming);
});

onMounted(() => {
	cap.update();
	observer = new ResizeObserver(entries => {
		cap.update();
		for (const entry of entries) {
			const name = (entry.target as HTMLElement).dataset.tab as TabName | undefined;
			const pane = name ? panes.get(name) : undefined;
			if (!pane) continue;
			const height = Math.round(entry.contentBoxSize?.[0]?.blockSize ?? pane.element.clientHeight);
			if (height <= 0) continue;
			pane.height = height;
			if (name === props.active) fit(pane);
		}
	});
	const panel = cap.panel();
	if (panel) observer.observe(panel);
	for (const pane of panes.values()) observer.observe(pane.element);
});

onBeforeUnmount(() => {
	observer?.disconnect();
	for (const pane of panes.values()) {
		pane.stops.forEach(stop => stop());
		cancelFrame(pane.render);
		pane.x.destroy();
		pane.shown.destroy();
	}
});
</script>

<template>
	<div ref="root" class="viewport">
		<section
			v-for="name in visibleNames"
			:key="name"
			:ref="element => register(name, element)"
			class="tab-panel"
			role="tabpanel"
			:data-tab="name"
		>
			<slot :name="name" />
		</section>
	</div>
</template>
