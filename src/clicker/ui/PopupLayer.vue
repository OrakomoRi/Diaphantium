<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { animate, motionValue, type AnimationPlaybackControlsWithThen } from 'motion';
import { spring } from './motion/springs';
import { activeTheme } from './themes';
import PanelShell, { type PresenceState } from './PanelShell.vue';

const props = defineProps<{ open: boolean }>();

const emit = defineEmits<{ close: []; toggle: []; closed: [] }>();

const presence = motionValue(0);
const shown = ref(false);
const state = ref<PresenceState>('opening');

let running: AnimationPlaybackControlsWithThen | null = null;

function run(open: boolean): void {
	state.value = open ? 'opening' : 'closing';
	const theme = activeTheme();
	const animation = animate(presence, open ? 1 : 0, spring(open ? theme.presence.open : theme.presence.close));
	running = animation;
	animation.then(() => {
		if (running !== animation) return;
		running = null;
		if (open) {
			state.value = 'open';
			return;
		}
		shown.value = false;
		emit('closed');
	});
}

watch(() => props.open, open => {
	if (open) {
		if (!shown.value) {
			presence.jump(0);
			shown.value = true;
		}
		run(true);
	} else if (shown.value) {
		run(false);
	}
});

onBeforeUnmount(() => {
	running?.stop();
	running = null;
	presence.destroy();
});
</script>

<template>
	<PanelShell
		v-if="shown"
		:presence="presence"
		:state="state"
		@close="emit('close')"
		@toggle="emit('toggle')"
	/>
</template>
