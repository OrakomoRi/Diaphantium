<script setup lang="ts">
import { ref } from 'vue';
import { usePanelShell, usePanelState } from '../../model/panel';
import { clamp } from '../../motion/springs';
import { useRenderOn } from '../../motion/values';
import CloseButton from './components/CloseButton.vue';
import TabRail from './components/TabRail.vue';
import TabStack from './components/TabStack.vue';
import Signature from '../../components/Signature.vue';
import ClickerTab from './tabs/ClickerTab.vue';
import MiscellaneousTab from './tabs/MiscellaneousTab.vue';
import SettingsTab from './tabs/SettingsTab.vue';
import AboutTab from './tabs/AboutTab.vue';

const shell = usePanelShell();
const { activeTab } = usePanelState();
const dragging = shell.dragging;
const closing = shell.closing;

const panel = ref<HTMLElement | null>(null);

function renderPresence(): void {
	const element = panel.value;
	if (!element) return;
	const progress = shell.presence.get();
	if (progress >= 1) {
		element.style.opacity = '';
		element.style.transform = '';
		return;
	}
	element.style.opacity = String(clamp(progress, 0, 1));
	element.style.transform = `translate3d(0, ${(progress - 1) * 10}px, 0) scale(${0.95 + 0.05 * progress})`;
}

useRenderOn(shell.presence, renderPresence);
</script>

<template>
	<div ref="panel" class="popup__window" data-morph="surface" :data-dragging="dragging || undefined" :data-closing="closing || undefined">
		<CloseButton data-morph="content" @press="shell.close()" />
		<TabRail data-morph="content" v-model="activeTab" />
		<div class="popup__main" data-morph="content">
			<TabStack :active="activeTab">
				<ClickerTab />
				<MiscellaneousTab />
				<SettingsTab />
				<AboutTab />
			</TabStack>
			<Signature />
		</div>
	</div>
</template>
