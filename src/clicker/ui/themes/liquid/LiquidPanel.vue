<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'petite-vue-i18n';
import { Info, Settings, Sparkles, X, Zap } from '@lucide/vue';
import { TAB_NAMES, usePanelShell, usePanelState, type TabName } from '../../model/panel';
import { clamp } from '../../motion/springs';
import { useRenderOn } from '../../motion/values';
import Signature from '../../components/Signature.vue';
import SegmentedControl from './components/SegmentedControl.vue';
import IconButton from './components/IconButton.vue';
import TabViewport from './components/TabViewport.vue';
import ClickerTab from './tabs/ClickerTab.vue';
import MiscellaneousTab from './tabs/MiscellaneousTab.vue';
import SettingsTab from './tabs/SettingsTab.vue';
import AboutTab from './tabs/AboutTab.vue';

const RADIUS = 26;
const ORIGIN_Y = 0.35;
const ICONS = { clicker: Zap, miscellaneous: Sparkles, settings: Settings, about: Info } as const;

const { t } = useI18n();
const shell = usePanelShell();
const { activeTab } = usePanelState();

const tabOptions = computed(() => TAB_NAMES.map(name => ({
	id: name,
	label: t(`tabs.${name}`),
	icon: ICONS[name],
	iconOnly: true,
	data: { 'data-tab': name, 'aria-label': t(`${name}.header`) },
})));

const shadow = ref<HTMLElement | null>(null);
const glass = ref<HTMLElement | null>(null);
const content = ref<HTMLElement | null>(null);

function renderPresence(): void {
	const panel = glass.value;
	const body = content.value;
	const glow = shadow.value;
	if (!panel || !body || !glow) return;
	const progress = shell.presence.get();
	const shown = clamp(progress, 0, 1);
	const settled = !shell.closing.value && shown >= 1 && !shell.presence.isAnimating();

	if (settled) {
		panel.style.transform = '';
		panel.style.clipPath = '';
		glow.style.transform = '';
		glow.style.borderRadius = '';
		glow.style.opacity = '';
		body.style.opacity = '';
		body.style.transform = '';
		return;
	}

	const insetY = (1 - shown) * 0.42;
	const insetX = (1 - shown) * 0.26;
	const radius = RADIUS + (1 - shown) * 30;
	const scale = 0.88 + 0.12 * progress;
	const height = panel.offsetHeight;
	const kx = Math.max(0.01, 1 - 2 * insetX);
	const ky = Math.max(0.01, 1 - 2 * insetY);

	panel.style.transform = `scale(${scale})`;
	panel.style.clipPath = `inset(${insetY * 100}% ${insetX * 100}% round ${radius}px)`;

	glow.style.transform = `scale(${scale}) translate3d(0, ${(1 - ky) * (0.5 - ORIGIN_Y) * height}px, 0) scale(${kx}, ${ky})`;
	glow.style.borderRadius = `${radius / kx}px / ${radius / ky}px`;
	glow.style.opacity = String(shown);

	const reveal = clamp((progress - 0.38) / 0.62, 0, 1);
	body.style.opacity = String(reveal);
	body.style.transform = `translate3d(0, ${(1 - reveal) * 10}px, 0)`;
}

useRenderOn(shell.presence, renderPresence);

function setTab(name: string): void {
	activeTab.value = name as TabName;
}
</script>

<template>
	<div class="liquid" :data-dragging="shell.dragging.value || undefined">
		<div ref="shadow" class="liquid__shadow" data-morph="surface" aria-hidden="true"></div>
		<div ref="glass" class="popup__window liquid__window" data-morph="surface">
			<div ref="content" class="liquid__content" data-morph="content">
				<header class="liquid__topbar">
					<SegmentedControl :options="tabOptions" :model-value="activeTab" @update:model-value="setTab" />
					<IconButton class="popup__close" :label="$t('close')" v-tooltip="{ content: $t('tooltips.close'), kbd: 'Esc' }" @press="shell.close()">
						<X :size="15" :stroke-width="2.4" />
					</IconButton>
				</header>
				<TabViewport :active="activeTab">
					<template #clicker><ClickerTab /></template>
					<template #miscellaneous><MiscellaneousTab /></template>
					<template #settings><SettingsTab /></template>
					<template #about><AboutTab /></template>
				</TabViewport>
				<Signature />
			</div>
		</div>
	</div>
</template>
