<script setup lang="ts">
import { ref, watch } from 'vue';
import { animate } from 'motion';
import type { SupplyIcon } from '../../../model/supplyIcons';
import { clamp, prefersReducedMotion } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';

const SPREAD = 7;

const props = defineProps<{ icon: SupplyIcon; active: boolean; name: string }>();

const emit = defineEmits<{ toggle: [] }>();

const ring = ref<HTMLElement | null>(null);
let size = { width: 0, height: 0 };

const values = useMotionValues({ ring: 1 }, () => {
	const element = ring.value;
	if (!element) return;
	const progress = clamp(values.ring.get(), 0, 1);
	if (progress >= 1 || size.width === 0) {
		element.style.opacity = '0';
		element.style.transform = '';
		return;
	}
	const grow = SPREAD * 2 * progress;
	element.style.opacity = String((1 - progress) * 0.9);
	element.style.transform = `scale(${1 + grow / size.width}, ${1 + grow / size.height})`;
});

watch(() => props.active, active => {
	const element = ring.value;
	if (!active || !element || prefersReducedMotion()) return;
	size = { width: element.offsetWidth, height: element.offsetHeight };
	values.ring.jump(0);
	animate(values.ring, 1, { duration: 0.45, ease: [0.16, 1, 0.3, 1] });
});
</script>

<template>
	<button
		type="button"
		class="supply"
		:data-key="icon.key"
		:data-state="active ? 'on' : 'off'"
		:aria-pressed="active"
		:aria-label="name"
		v-tooltip="{ content: name, kbd: icon.key }"
		@click="emit('toggle')"
	>
		<span ref="ring" class="supply__ring" aria-hidden="true"></span>
		<svg class="supply__icon" :viewBox="icon.viewBox" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<path v-for="(d, index) in icon.paths" :key="index" fill-rule="evenodd" clip-rule="evenodd" :d="d" />
		</svg>
		<span class="supply__key" aria-hidden="true">{{ icon.key }}</span>
	</button>
</template>
