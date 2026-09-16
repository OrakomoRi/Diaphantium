<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { sanitizeDigits, useMineDelay } from '../../../model/mineDelay';
import { shake } from '../../../motion/feedback';
import { flash, flashError, glow, useStateLayer } from '../motion';

const ERROR_VISIBLE_MS = 4000;
const ROLLBACK_MS = 260;

defineProps<{ label: string }>();

const emit = defineEmits<{ error: [invalid: boolean] }>();

const { draft, commit, rollback } = useMineDelay();

const well = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);
const ring = ref<HTMLElement | null>(null);
const tint = ref<HTMLElement | null>(null);
const success = ref<HTMLElement | null>(null);
const input = ref<HTMLInputElement | null>(null);
const invalid = ref(false);
const focused = ref(false);

let settled = false;
let rollbackTimer: ReturnType<typeof setTimeout> | undefined;
let errorTimer: ReturnType<typeof setTimeout> | undefined;

useStateLayer(well, plate, () => focused.value);

function setError(on: boolean): void {
	clearTimeout(errorTimer);
	invalid.value = on;
	emit('error', on);
	if (on) {
		errorTimer = setTimeout(() => {
			invalid.value = false;
			emit('error', false);
		}, ERROR_VISIBLE_MS);
	}
}

function submit(signal: boolean): void {
	const result = commit();
	if (result !== 'invalid') {
		setError(false);
		if (signal && result === 'saved') flash(success.value);
		return;
	}
	if (!signal) {
		rollback();
		return;
	}
	shake(well.value);
	flashError(tint.value);
	setError(true);
	clearTimeout(rollbackTimer);
	rollbackTimer = setTimeout(() => {
		if (!focused.value) rollback();
	}, ROLLBACK_MS);
}

function onInput(event: Event): void {
	const element = event.target as HTMLInputElement;
	const { value, caret } = sanitizeDigits(element.value, element.selectionStart ?? element.value.length);
	if (value !== element.value) {
		element.value = value;
		element.setSelectionRange(caret, caret);
	}
	draft.value = value;
}

function onFocus(): void {
	clearTimeout(rollbackTimer);
	focused.value = true;
	settled = false;
	glow(ring.value, true);
}

function onBlur(): void {
	focused.value = false;
	glow(ring.value, false);
	if (!settled) submit(false);
}

function onKeydown(event: KeyboardEvent): void {
	if (event.code === 'Enter' || event.code === 'NumpadEnter') {
		event.preventDefault();
		settled = true;
		submit(true);
		input.value?.blur();
	} else if (event.code === 'Escape') {
		event.preventDefault();
		settled = true;
		rollback();
		setError(false);
		input.value?.blur();
	}
}

onBeforeUnmount(() => {
	clearTimeout(rollbackTimer);
	clearTimeout(errorTimer);
});
</script>

<template>
	<label ref="well" class="control well" data-no-drag>
		<span ref="plate" class="control__plate" aria-hidden="true"></span>
		<span ref="tint" class="control__error" aria-hidden="true"></span>
		<span ref="success" class="control__success" aria-hidden="true"></span>
		<span ref="ring" class="control__ring" aria-hidden="true"></span>
		<input
			ref="input"
			class="well__input field--delay"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			autocomplete="off"
			spellcheck="false"
			:aria-label="label"
			:aria-invalid="invalid || undefined"
			:value="draft"
			@input="onInput"
			@focus="onFocus"
			@blur="onBlur"
			@keydown="onKeydown"
		>
		<span class="well__suffix">{{ $t('clicker.milliseconds') }}</span>
	</label>
</template>
