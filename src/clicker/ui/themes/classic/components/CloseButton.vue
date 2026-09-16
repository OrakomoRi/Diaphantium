<script setup lang="ts">
import { ref } from 'vue';
import { X } from '@lucide/vue';
import { clamp, toValue } from '../../../motion/springs';
import { useHover } from '../../../motion/gestures';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const emit = defineEmits<{ press: [] }>();

const button = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);

const values = useMotionValues({ armed: 0 }, () => {
	if (plate.value) plate.value.style.opacity = String(clamp(values.armed.get(), 0, 1));
});

useHover(button, hovered => toValue(values.armed, hovered ? 1 : 0, SPRINGS.fade));
</script>

<template>
	<button ref="button" type="button" class="popup__close" :aria-label="$t('close')" v-tooltip="{ content: $t('tooltips.close'), kbd: 'Esc' }" @click="emit('press')">
		<span ref="plate" class="popup__close-plate" aria-hidden="true"></span>
		<X class="popup__close-icon" />
	</button>
</template>
