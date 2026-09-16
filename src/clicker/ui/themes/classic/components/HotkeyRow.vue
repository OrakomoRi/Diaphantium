<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { RotateCcw } from '@lucide/vue';
import type { AssignResult, HotkeyState } from '../../../model/hotkeys';
import { shake } from '../../../motion/feedback';
import { toValue } from '../../../motion/springs';
import { useHover } from '../../../motion/gestures';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const INVALID_MS = 200;
const WIND_UP = -40;

const props = defineProps<{
	hotkey: HotkeyState;
	duplicate: boolean;
	assign: (code: string) => AssignResult;
	reset: () => void;
}>();

const field = ref<HTMLInputElement | null>(null);
const button = ref<HTMLElement | null>(null);
const icon = ref<HTMLElement | null>(null);
const invalid = ref(false);

let turns = 0;
let hovered = false;
let invalidTimer: ReturnType<typeof setTimeout> | undefined;

const values = useMotionValues({ angle: 0 }, () => {
	if (icon.value) icon.value.style.transform = `rotate(${values.angle.get()}deg)`;
});

function restingAngle(): number {
	return turns * -360 + (hovered ? WIND_UP : 0);
}

useHover(button, next => {
	hovered = next;
	toValue(values.angle, restingAngle(), SPRINGS.windUp);
});

function onReset(): void {
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
	shake(field.value);
	clearTimeout(invalidTimer);
	invalidTimer = setTimeout(() => {
		invalid.value = false;
	}, INVALID_MS);
}

function focus(event: MouseEvent): void {
	(event.currentTarget as HTMLInputElement).focus();
}

function onKeydown(event: KeyboardEvent): void {
	event.preventDefault();
	event.stopPropagation();
	if (props.assign(event.code) === 'reserved') flagInvalid();
	(event.currentTarget as HTMLInputElement).blur();
}

onBeforeUnmount(() => clearTimeout(invalidTimer));
</script>

<template>
	<div class="hotkey">
		<button ref="button" type="button" class="hotkey__reset" :data-action="hotkey.action" :aria-label="$t('settings.resetHotkey')" v-tooltip="$t('tooltips.reset')" @click="onReset">
			<span ref="icon" class="hotkey__reset-icon"><RotateCcw /></span>
		</button>

		<label class="hotkey__label">
			<input
				ref="field"
				type="text"
				class="field field--hotkey"
				readonly
				:aria-invalid="invalid || undefined"
				:data-duplicate="duplicate || undefined"
				:data-action="hotkey.action"
				:data-code="hotkey.code"
				:value="hotkey.code ?? ''"
				v-tooltip="`${$t(hotkey.hint)}\n${$t('tooltips.hotkey')}\n${$t('tooltips.hotkeyReserved')}`"
				@click="focus"
				@keydown="onKeydown"
			/>
			<span class="option__label">{{ $t(hotkey.label) }}</span>
		</label>
	</div>
</template>
