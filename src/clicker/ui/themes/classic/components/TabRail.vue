<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { animate } from 'motion';
import { Blocks, Info, Settings, Sparkles, Zap } from '@lucide/vue';
import { useThemeContext, useVisiblePanelTabs, type TabName } from '../../../model/panel';
import { spring, toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';

const ICONS = { clicker: Zap, miscellaneous: Sparkles, settings: Settings, about: Info, plugins: Blocks } as const;

const visibleNames = useVisiblePanelTabs();
const TABS = computed(() => visibleNames.value.map(name => ({ name, icon: ICONS[name] })));

const active = defineModel<TabName>({ required: true });

const { layout } = useThemeContext();

function onTabEnter(el: Element, done: () => void): void {
	animate(el, { opacity: [0, 1], scale: [0.6, 1] }, spring(SPRINGS.fade)).then(done);
}

function onTabLeave(el: Element, done: () => void): void {
	animate(el, { opacity: [1, 0], scale: [1, 0.6] }, spring(SPRINGS.fade)).then(done);
}

const indicator = ref<HTMLElement | null>(null);
const tabs = new Map<TabName, HTMLElement>();

const values = useMotionValues({ y: 0 }, () => {
	if (indicator.value) indicator.value.style.transform = `translate3d(0, ${values.y.get()}px, 0)`;
});

function setTab(name: TabName, element: unknown): void {
	if (element instanceof HTMLElement) tabs.set(name, element);
	else tabs.delete(name);
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
watch(visibleNames, async () => {
	await layout.run(() => {});
	moveTo(active.value, false);
});

onMounted(() => moveTo(active.value, true));
</script>

<template>
	<nav class="popup__nav" role="tablist" aria-orientation="vertical">
		<span ref="indicator" class="popup__indicator" aria-hidden="true"></span>
		<TransitionGroup :css="false" @enter="onTabEnter" @leave="onTabLeave">
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
		</TransitionGroup>
	</nav>
</template>
