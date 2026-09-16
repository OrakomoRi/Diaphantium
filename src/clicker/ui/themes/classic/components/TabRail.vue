<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Info, Settings, Sparkles, Zap } from '@lucide/vue';
import type { TabName } from '../../../model/panel';
import { toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const TABS = [
	{ name: 'clicker', icon: Zap },
	{ name: 'miscellaneous', icon: Sparkles },
	{ name: 'settings', icon: Settings },
	{ name: 'about', icon: Info },
] as const;

const active = defineModel<TabName>({ required: true });

const indicator = ref<HTMLElement | null>(null);
const tabs = new Map<TabName, HTMLElement>();

const values = useMotionValues({ y: 0 }, () => {
	if (indicator.value) indicator.value.style.transform = `translate3d(0, ${values.y.get()}px, 0)`;
});

function setTab(name: TabName, element: unknown): void {
	if (element instanceof HTMLElement) tabs.set(name, element);
}

function moveTo(name: TabName, instant: boolean): void {
	const tab = tabs.get(name);
	if (!tab) return;
	if (instant && indicator.value) {
		indicator.value.style.left = `${tab.offsetLeft}px`;
		indicator.value.style.width = `${tab.offsetWidth}px`;
		indicator.value.style.height = `${tab.offsetHeight}px`;
		values.y.jump(tab.offsetTop);
		return;
	}
	toValue(values.y, tab.offsetTop, SPRINGS.slide);
}

function select(name: TabName): void {
	active.value = name;
}

function onKeydown(event: KeyboardEvent, name: TabName): void {
	if (event.code === 'Space' || event.code === 'Enter') {
		event.preventDefault();
		select(name);
	}
}

watch(active, name => moveTo(name, false));

onMounted(() => moveTo(active.value, true));
</script>

<template>
	<nav class="popup__nav" role="tablist" aria-orientation="vertical">
		<span ref="indicator" class="popup__indicator" aria-hidden="true"></span>
		<div
			v-for="tab in TABS"
			:key="tab.name"
			:ref="element => setTab(tab.name, element)"
			class="popup__tab"
			role="tab"
			:data-tab="tab.name"
			:aria-selected="active === tab.name"
			:tabindex="active === tab.name ? -1 : 0"
			:aria-label="$t(`${tab.name}.header`)"
			v-tooltip="active === tab.name ? null : { content: $t(`${tab.name}.header`), side: 'right' }"
			@click="select(tab.name)"
			@keydown="onKeydown($event, tab.name)"
		>
			<component :is="tab.icon" />
		</div>
	</nav>
</template>
