<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { animate } from 'motion';
import { spring } from '../../../motion/springs';
import type { TooltipValue } from '../../../tooltip/tooltip';
import { SPRINGS } from '../springs';

const props = withDefaults(defineProps<{
	title: string;
	description?: string;
	error?: string | null;
	tone?: 'default' | 'danger';
	tooltip?: TooltipValue;
}>(), { tone: 'default' });

const desc = ref<HTMLElement | null>(null);
const text = computed(() => props.error || props.description);

watch(() => props.error, (next, previous) => {
	if (!desc.value || !next === !previous) return;
	animate(desc.value, { opacity: [0, 1], y: [next ? -4 : 4, 0] }, spring(SPRINGS.soft));
});
</script>

<template>
	<div class="setting" :data-tone="tone">
		<div class="setting__main">
			<div class="setting__text" v-tooltip="tooltip">
				<span class="setting__title option__label">{{ title }}</span>
				<span
					v-if="text"
					ref="desc"
					class="setting__desc"
					:data-error="error ? '' : undefined"
					:role="error ? 'alert' : undefined"
				>{{ text }}</span>
			</div>
			<div v-if="$slots.default" class="setting__control">
				<slot />
			</div>
		</div>
		<div v-if="$slots.below" class="setting__below">
			<slot name="below" />
		</div>
	</div>
</template>
