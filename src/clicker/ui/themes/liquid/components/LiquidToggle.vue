<script setup lang="ts">
import { ref, watch } from 'vue';
import { clamp, prefersReducedMotion, toValue } from '../../../motion/springs';
import { usePress } from '../../../motion/gestures';
import { useMotionValues } from '../../../motion/values';
import { useStateLayer } from '../motion';
import { SPRINGS } from '../springs';

const TRACK = 48;
const KNOB = 22;
const INSET = 3;
const TRAVEL = TRACK - KNOB - INSET * 2;
const MAX_STRETCH = 10;
const PRESS_GROW = 5;

const props = withDefaults(defineProps<{ checked: boolean; option: string; label: string; tone?: 'default' | 'danger' }>(), { tone: 'default' });

const emit = defineEmits<{ change: [checked: boolean] }>();

const track = ref<HTMLElement | null>(null);
const knob = ref<HTMLElement | null>(null);
const fill = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);

useStateLayer(track, plate);

const values = useMotionValues({ x: props.checked ? TRAVEL : 0, lit: props.checked ? 1 : 0, pressed: 0 }, () => {
	if (fill.value) fill.value.style.opacity = String(clamp(values.lit.get(), 0, 1));
	const element = knob.value;
	if (!element) return;
	const position = values.x.get();
	if (prefersReducedMotion()) {
		element.style.transform = `translate3d(${INSET + position}px, 0, 0)`;
		element.style.borderRadius = '';
		return;
	}
	const velocity = values.x.getVelocity();
	const stretch = Math.min(MAX_STRETCH, Math.abs(velocity) * 0.02);
	const grow = clamp(values.pressed.get(), 0, 1) * PRESS_GROW;
	let width = KNOB + stretch + grow;
	let left = INSET + position - (velocity > 0 ? stretch : 0) - grow * clamp(position / TRAVEL, 0, 1);
	if (left < INSET) {
		width -= INSET - left;
		left = INSET;
	}
	width = Math.max(KNOB * 0.8, Math.min(width, TRACK - INSET - left));
	const scale = width / KNOB;
	const settled = Math.abs(scale - 1) < 0.001;
	element.style.transform = settled ? `translate3d(${left}px, 0, 0)` : `translate3d(${left}px, 0, 0) scaleX(${scale})`;
	element.style.borderRadius = settled ? '' : `${KNOB / 2 / scale}px / ${KNOB / 2}px`;
});

watch(() => props.checked, checked => {
	toValue(values.x, checked ? TRAVEL : 0, SPRINGS.snappy);
	toValue(values.lit, checked ? 1 : 0, SPRINGS.fade);
});

usePress(track, pressed => toValue(values.pressed, pressed ? 1 : 0, pressed ? SPRINGS.snappy : SPRINGS.soft));
</script>

<template>
	<button
		ref="track"
		type="button"
		class="control toggle"
		role="switch"
		:data-option="option"
		:data-tone="tone"
		:aria-checked="checked"
		:aria-label="label"
		@click="emit('change', !checked)"
	>
		<span ref="plate" class="control__plate" aria-hidden="true"></span>
		<span ref="fill" class="control__fill" aria-hidden="true"></span>
		<span ref="knob" class="toggle__knob" aria-hidden="true"></span>
	</button>
</template>
