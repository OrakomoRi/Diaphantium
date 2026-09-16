<script lang="ts">
import type { Component } from 'vue';

export interface SegmentOption {
	id: string;
	label: string;
	icon?: Component;
	iconOnly?: boolean;
	data?: Record<string, string>;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { clamp, toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';
import SegmentButton from './SegmentButton.vue';

const props = defineProps<{ options: readonly SegmentOption[]; modelValue: string; compact?: boolean; role?: 'tablist' | 'radiogroup' }>();

const emit = defineEmits<{ 'update:modelValue': [value: string, element: HTMLElement] }>();

const root = ref<HTMLElement | null>(null);
const droplet = ref<HTMLElement | null>(null);
const buttons: HTMLElement[] = [];

let base = 0;
let height = 0;
let placed = false;
let observer: ResizeObserver | null = null;

const edges = useMotionValues({ left: 0, right: 0 }, render);

function render(): void {
	const element = droplet.value;
	if (!element || base <= 0) return;
	const left = edges.left.get();
	const width = Math.max(1, edges.right.get() - left);
	const stretch = width / base;
	const squash = clamp(1 - (stretch - 1) * 0.22, 0.72, 1);
	const settled = Math.abs(stretch - 1) < 0.001;
	element.style.transform = settled ? `translate3d(${left}px, 0, 0)` : `translate3d(${left}px, 0, 0) scale(${stretch}, ${squash})`;
	element.style.borderRadius = settled ? '' : `${(height * squash) / 2 / stretch}px / ${height / 2}px`;
}

function setButton(index: number, instance: unknown): void {
	const node = (instance as { $el?: HTMLElement } | null)?.$el ?? null;
	if (node) buttons[index] = node;
}

function measure(id: string): { left: number; right: number } | null {
	const element = buttons[props.options.findIndex(option => option.id === id)];
	if (!element || element.offsetWidth === 0) return null;
	const width = element.offsetWidth;
	if (droplet.value && width !== base) {
		base = width;
		droplet.value.style.width = `${width}px`;
	}
	height = droplet.value?.offsetHeight ?? 0;
	return { left: element.offsetLeft, right: element.offsetLeft + width };
}

function moveTo(id: string, instant: boolean): void {
	const target = measure(id);
	if (!target) return;
	if (instant || !placed) {
		edges.left.jump(target.left);
		edges.right.jump(target.right);
		placed = true;
		render();
		return;
	}
	const forward = target.left > edges.left.get();
	toValue(edges.left, target.left, forward ? SPRINGS.trail : SPRINGS.lead);
	toValue(edges.right, target.right, forward ? SPRINGS.lead : SPRINGS.trail);
}

watch(() => props.modelValue, id => moveTo(id, false));

onMounted(() => {
	moveTo(props.modelValue, true);
	observer = new ResizeObserver(() => moveTo(props.modelValue, !edges.left.isAnimating() && !edges.right.isAnimating()));
	if (root.value) observer.observe(root.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
	<div ref="root" class="segmented" :class="{ 'segmented--compact': compact }" :role="role ?? 'tablist'">
		<span ref="droplet" class="segmented__droplet" aria-hidden="true"></span>
		<SegmentButton
			v-for="(option, index) in options"
			:key="option.id"
			:ref="instance => setButton(index, instance)"
			:option="option"
			:role="role === 'radiogroup' ? 'radio' : 'tab'"
			:active="option.id === modelValue"
			@select="element => emit('update:modelValue', option.id, element)"
		/>
	</div>
</template>
