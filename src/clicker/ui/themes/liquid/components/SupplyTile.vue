<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { animate } from 'motion';
import type { SupplyIcon } from '../../../model/supplyIcons';
import { spring } from '../../../motion/springs';
import { useStateLayer } from '../motion';
import { SPRINGS } from '../springs';

const props = defineProps<{ icon: SupplyIcon; active: boolean; name: string; short: string }>();

const emit = defineEmits<{ toggle: [] }>();

const button = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);
const flood = ref<HTMLElement | null>(null);

useStateLayer(button, plate);

let origin: { x: number; y: number } | null = null;

function place(): void {
	const tile = button.value;
	const element = flood.value;
	if (!tile || !element) return;
	const width = tile.offsetWidth;
	const height = tile.offsetHeight;
	if (width === 0 || height === 0) return;
	const x = origin ? origin.x * width : width / 2;
	const y = origin ? origin.y * height : height / 2;
	const radius = Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y)));
	element.style.width = element.style.height = `${radius * 2}px`;
	element.style.left = `${Math.round(x - radius)}px`;
	element.style.top = `${Math.round(y - radius)}px`;
}

function onClick(event: MouseEvent): void {
	const tile = button.value;
	origin = null;
	if (tile && event.detail > 0) {
		const box = tile.getBoundingClientRect();
		if (box.width > 0 && box.height > 0) origin = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
	}
	emit('toggle');
}

watch(() => props.active, active => {
	place();
	origin = null;
	if (flood.value) animate(flood.value, { scale: active ? 1 : 0, opacity: active ? 1 : 0 }, spring(active ? SPRINGS.soft : SPRINGS.fade));
});

onMounted(() => {
	place();
	if (flood.value) animate(flood.value, { scale: props.active ? 1 : 0, opacity: props.active ? 1 : 0 }, { duration: 0 });
});
</script>

<template>
	<button
		ref="button"
		type="button"
		class="tile supply"
		:data-key="icon.key"
		:data-state="active ? 'on' : 'off'"
		:aria-pressed="active"
		:aria-label="name"
		v-tooltip="{ content: name, kbd: icon.key }"
		@click="onClick"
	>
		<span ref="plate" class="tile__plate" aria-hidden="true"></span>
		<span ref="flood" class="tile__flood" aria-hidden="true"></span>
		<span class="tile__body">
			<svg class="tile__icon" :viewBox="icon.viewBox" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path v-for="(d, index) in icon.paths" :key="index" fill-rule="evenodd" clip-rule="evenodd" :d="d" />
			</svg>
			<span class="tile__label">{{ short }}</span>
		</span>
		<span class="tile__key" aria-hidden="true">{{ icon.key }}</span>
	</button>
</template>
