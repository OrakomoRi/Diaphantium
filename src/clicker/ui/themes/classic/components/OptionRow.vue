<script setup lang="ts">
import type { Component } from 'vue';
import type { TooltipValue } from '../../../tooltip/tooltip';

withDefaults(defineProps<{
	label: string;
	hint?: string;
	icon?: Component;
	tone?: 'default' | 'danger';
	field?: boolean;
	tooltip?: TooltipValue;
}>(), { tone: 'default' });
</script>

<template>
	<label class="option" :class="{ 'option--field': field }" :data-tone="tone" v-tooltip="tooltip">
		<span v-if="icon" class="option__icon" aria-hidden="true"><component :is="icon" /></span>
		<span class="option__text">
			<span class="option__label">{{ label }}</span>
			<span v-if="hint" class="option__hint">{{ hint }}</span>
		</span>
		<slot />
	</label>
</template>
