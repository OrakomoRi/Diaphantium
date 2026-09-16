<script setup lang="ts">
import { ref, watch } from 'vue';
import { toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { useStateLayer } from '../motion';
import { SPRINGS } from '../springs';
import type { SegmentOption } from './SegmentedControl.vue';

const props = defineProps<{ option: SegmentOption; active: boolean; role: 'tab' | 'radio' }>();

const emit = defineEmits<{ select: [element: HTMLElement] }>();

const button = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);

useStateLayer(button, plate, () => props.active);

const values = useMotionValues({ lit: props.active ? 1 : 0 }, () => {
	if (content.value) content.value.style.opacity = String(0.62 + 0.38 * values.lit.get());
});

watch(() => props.active, active => toValue(values.lit, active ? 1 : 0, SPRINGS.fade));

function select(): void {
	if (!props.active && button.value) emit('select', button.value);
}
</script>

<template>
	<button
		ref="button"
		type="button"
		class="segment"
		:role="role"
		:aria-selected="role === 'tab' ? active : undefined"
		:aria-checked="role === 'radio' ? active : undefined"
		:tabindex="active ? -1 : 0"
		v-bind="option.data"
		v-tooltip="option.iconOnly && !active ? option.label : null"
		@click="select"
	>
		<span ref="plate" class="segment__plate" aria-hidden="true"></span>
		<span ref="content" class="segment__content">
			<component :is="option.icon" v-if="option.icon" :size="option.iconOnly ? 16 : 14" :stroke-width="2.2" />
			<span v-if="!option.iconOnly">{{ option.label }}</span>
		</span>
	</button>
</template>
