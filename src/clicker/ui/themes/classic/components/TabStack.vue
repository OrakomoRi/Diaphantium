<script lang="ts">
import type { InjectionKey } from 'vue';
import type { TabName } from '../../../model/panel';

export interface PaneController {
	element(): HTMLElement | null;
	show(direction: number, instant: boolean): void;
	hide(direction: number): void;
}

export interface TabStackContext {
	register(name: TabName, pane: PaneController): () => void;
	isActive(name: TabName): boolean;
}

export const TAB_STACK: InjectionKey<TabStackContext> = Symbol('tab-stack');
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { TAB_NAMES } from '../../../model/panel';
import { useStackCap } from '../../../model/stackCap';
import { toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const props = defineProps<{ active: TabName }>();

const root = ref<HTMLElement | null>(null);
const panes = new Map<TabName, PaneController>();
let observer: ResizeObserver | null = null;
let sized = false;
let target = -1;

const cap = useStackCap(root);

const values = useMotionValues({ height: 0 }, () => {
	if (root.value && sized) root.value.style.height = `${values.height.get()}px`;
});

provide(TAB_STACK, {
	register(name, pane) {
		panes.set(name, pane);
		return () => panes.delete(name);
	},
	isActive: name => name === props.active,
});

function fit(): void {
	const height = panes.get(props.active)?.element()?.offsetHeight ?? 0;
	if (height <= 0) return;
	if (!sized) {
		sized = true;
		target = height;
		values.height.jump(height);
		if (root.value) root.value.style.height = `${height}px`;
		return;
	}
	if (height === target) return;
	target = height;
	toValue(values.height, height, SPRINGS.height);
}

watch(() => props.active, (next, previous) => {
	const direction = TAB_NAMES.indexOf(next) >= TAB_NAMES.indexOf(previous) ? 1 : -1;
	panes.get(previous)?.hide(direction);
	panes.get(next)?.show(direction, false);
	fit();
});

onMounted(() => {
	cap.update();
	fit();
	observer = new ResizeObserver(() => {
		cap.update();
		fit();
	});
	const panel = cap.panel();
	if (panel) observer.observe(panel);
	for (const pane of panes.values()) {
		const element = pane.element();
		if (element) observer.observe(element);
	}
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
	<div ref="root" class="tab-stack">
		<slot />
	</div>
</template>
