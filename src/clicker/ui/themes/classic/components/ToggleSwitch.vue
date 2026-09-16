<script setup lang="ts">
import { ref, watch } from 'vue';
import { clamp, toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const props = withDefaults(defineProps<{ checked: boolean; option: string; tone?: 'default' | 'danger' }>(), { tone: 'default' });

const emit = defineEmits<{ change: [checked: boolean] }>();

const thumb = ref<HTMLElement | null>(null);
const glow = ref<HTMLElement | null>(null);
const thumbLit = ref<HTMLElement | null>(null);

const values = useMotionValues({ x: props.checked ? 1 : 0, lit: props.checked ? 1 : 0 }, () => {
	if (thumb.value) thumb.value.style.transform = `translate3d(${values.x.get() * 24}px, 0, 0)`;
	const opacity = String(clamp(values.lit.get(), 0, 1));
	if (glow.value) glow.value.style.opacity = opacity;
	if (thumbLit.value) thumbLit.value.style.opacity = opacity;
});

watch(() => props.checked, checked => {
	toValue(values.x, checked ? 1 : 0, SPRINGS.knob);
	toValue(values.lit, checked ? 1 : 0, SPRINGS.fade);
});

function onChange(event: Event): void {
	emit('change', (event.target as HTMLInputElement).checked);
}
</script>

<template>
	<span class="toggle" :data-tone="tone">
		<input type="checkbox" class="switch" :data-option="option" :checked="checked" @change="onChange">
		<span class="toggle__track" aria-hidden="true"><span ref="glow" class="toggle__glow"></span></span>
		<span ref="thumb" class="toggle__thumb" aria-hidden="true"><span ref="thumbLit" class="toggle__thumb-lit"></span></span>
	</span>
</template>
