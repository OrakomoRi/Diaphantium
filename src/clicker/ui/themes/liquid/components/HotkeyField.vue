<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RotateCcw } from '@lucide/vue';
import { useI18n } from 'petite-vue-i18n';
import type { AssignResult, HotkeyState } from '../../../model/hotkeys';
import { usePanelShell } from '../../../model/panel';
import { deepActiveElement } from '../../../dom';
import { shake } from '../../../motion/feedback';
import { clamp, toValue } from '../../../motion/springs';
import { useHover } from '../../../motion/gestures';
import { useMotionValues } from '../../../motion/values';
import { glow, useStateLayer } from '../motion';
import { SPRINGS } from '../springs';

const INVALID_MS = 200;
const WIND_UP = -40;

const props = defineProps<{
	hotkey: HotkeyState;
	duplicate: boolean;
	changed: boolean;
	assign: (code: string) => AssignResult;
	reset: () => void;
}>();

const { t } = useI18n();
const shell = usePanelShell();

const well = ref<HTMLElement | null>(null);
const plate = ref<HTMLElement | null>(null);
const ring = ref<HTMLElement | null>(null);
const resetButton = ref<HTMLElement | null>(null);
const resetPlate = ref<HTMLElement | null>(null);
const icon = ref<HTMLElement | null>(null);
const listening = ref(false);
const invalid = ref(false);

let turns = 0;
let hovered = false;
let invalidTimer: ReturnType<typeof setTimeout> | undefined;

const text = computed(() => (listening.value ? t('settings.pressKey') : props.hotkey.code ?? t('settings.notSet')));

useStateLayer(well, plate, () => listening.value);
useStateLayer(resetButton, resetPlate, () => !props.changed);

const values = useMotionValues({ angle: 0, shown: props.changed ? 1 : 0 }, () => {
	if (icon.value) icon.value.style.transform = `rotate(${values.angle.get()}deg)`;
	if (resetButton.value) {
		resetButton.value.style.opacity = String(clamp(values.shown.get(), 0, 1));
		resetButton.value.style.pointerEvents = props.changed ? '' : 'none';
	}
});

function restingAngle(): number {
	return turns * -360 + (hovered ? WIND_UP : 0);
}

useHover(resetButton, next => {
	hovered = next && props.changed;
	toValue(values.angle, restingAngle(), SPRINGS.windUp);
});

watch(() => props.changed, changed => {
	toValue(values.shown, changed ? 1 : 0, changed ? SPRINGS.snappy : SPRINGS.fade);
	if (!changed) hovered = false;
});

watch(listening, on => glow(ring.value, on));

function onReset(): void {
	if (!props.changed) return;
	if (resetButton.value && deepActiveElement(resetButton.value) === resetButton.value) well.value?.focus({ preventScroll: true });
	props.reset();
	turns++;
	toValue(values.angle, restingAngle(), SPRINGS.spin).then(() => {
		if (hovered || values.angle.isAnimating()) return;
		turns = 0;
		values.angle.jump(0);
	});
}

function flagInvalid(): void {
	invalid.value = true;
	shake(well.value);
	clearTimeout(invalidTimer);
	invalidTimer = setTimeout(() => {
		invalid.value = false;
	}, INVALID_MS);
}

function onKeydown(event: KeyboardEvent): void {
	if (!listening.value) return;
	event.preventDefault();
	event.stopPropagation();
	const result = props.assign(event.code);
	if (result === 'reserved') {
		flagInvalid();
		return;
	}
	listening.value = false;
	shell.releasePointerFocus();
}

onBeforeUnmount(() => clearTimeout(invalidTimer));
</script>

<template>
	<div class="hotkey">
		<button
			ref="resetButton"
			type="button"
			class="icon-button hotkey__reset"
			:data-action="hotkey.action"
			:aria-label="$t('settings.resetHotkey')"
			:aria-hidden="!changed"
			:tabindex="changed ? 0 : -1"
			v-tooltip="changed ? $t('tooltips.reset') : null"
			@click="onReset"
		>
			<span ref="resetPlate" class="icon-button__plate" aria-hidden="true"></span>
			<span ref="icon" class="hotkey__reset-icon"><RotateCcw :size="13" :stroke-width="2.4" /></span>
		</button>
		<button
			ref="well"
			type="button"
			class="control well hotkey__well field--hotkey"
			:data-action="hotkey.action"
			:data-code="hotkey.code"
			:data-duplicate="duplicate && !listening ? '' : undefined"
			:data-empty="!hotkey.code && !listening ? '' : undefined"
			:data-listening="listening ? '' : undefined"
			:aria-invalid="invalid || undefined"
			:aria-label="`${$t(hotkey.label)}: ${hotkey.code ?? $t('settings.notSet')}`"
			v-tooltip="listening ? null : `${$t(hotkey.hint)}\n${$t('tooltips.hotkey')}\n${$t('tooltips.hotkeyReserved')}`"
			@click="listening = !listening"
			@keydown="onKeydown"
			@blur="listening = false"
		>
			<span ref="plate" class="control__plate" aria-hidden="true"></span>
			<span ref="ring" class="control__ring" aria-hidden="true"></span>
			<span class="well__text">{{ text }}</span>
		</button>
	</div>
</template>
