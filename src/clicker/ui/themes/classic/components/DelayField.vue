<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { sanitizeDigits, useMineDelay } from '../../../model/mineDelay';
import { shake } from '../../../motion/feedback';

const INVALID_MS = 200;

const { draft, commit, rollback } = useMineDelay();

const input = ref<HTMLInputElement | null>(null);
const invalid = ref(false);
let restoreTimer: ReturnType<typeof setTimeout> | undefined;

function onInput(event: Event): void {
	const element = event.target as HTMLInputElement;
	const { value, caret } = sanitizeDigits(element.value, element.selectionStart ?? element.value.length);
	if (value !== element.value) {
		element.value = value;
		element.setSelectionRange(caret, caret);
	}
	draft.value = value;
}

function onKeydown(event: KeyboardEvent): void {
	if (event.code === 'Enter' || event.code === 'NumpadEnter') input.value?.blur();
}

function onChange(): void {
	if (commit() !== 'invalid') return;
	invalid.value = true;
	shake(input.value);
	clearTimeout(restoreTimer);
	restoreTimer = setTimeout(() => {
		invalid.value = false;
		rollback();
	}, INVALID_MS);
}

onBeforeUnmount(() => clearTimeout(restoreTimer));
</script>

<template>
	<input
		ref="input"
		type="text"
		inputmode="numeric"
		pattern="[0-9]*"
		autocomplete="off"
		spellcheck="false"
		class="field field--delay"
		:value="draft"
		:aria-invalid="invalid || undefined"
		@input="onInput"
		@keydown="onKeydown"
		@change="onChange"
	>
</template>
