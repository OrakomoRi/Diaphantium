<script setup lang="ts">
import { ref } from 'vue';
import { useStateLayer } from '../motion';

defineProps<{ label: string }>();

const emit = defineEmits<{ press: [] }>();

const button = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);

useStateLayer(button, plate);

defineExpose({ el: button });
</script>

<template>
	<button ref="button" type="button" class="icon-button" :aria-label="label" @click="emit('press')">
		<span ref="plate" class="icon-button__plate" aria-hidden="true"></span>
		<slot />
	</button>
</template>
