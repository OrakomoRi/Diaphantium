<script lang="ts">
import type { Theme, ThemePart } from './themes/types';

const sheets = new Map<string, CSSStyleSheet>();

function sheetFor(theme: Theme): CSSStyleSheet {
	let sheet = sheets.get(theme.id);
	if (!sheet) {
		sheet = new CSSStyleSheet();
		sheet.replaceSync(theme.styles);
		sheets.set(theme.id, sheet);
	}
	return sheet;
}
</script>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, provide, ref, shallowRef } from 'vue';
import { EnvironmentProvider } from '@ark-ui/vue/environment';
import { PANEL_SHELL, THEME_CONTEXT, type PanelShell } from './model/panel';
import { createLayoutMorph } from './motion/layoutMorph';

const props = withDefaults(defineProps<{ theme: Theme; part: ThemePart; active?: boolean; overlay?: boolean }>(), { active: true, overlay: false });

const host = ref<HTMLElement | null>(null);
const target = shallowRef<HTMLElement | null>(null);
const shell = inject(PANEL_SHELL, null);
const layout = createLayoutMorph(() => target.value, () => props.theme.layout, () => shell?.scale.get() ?? 1);

provide(THEME_CONTEXT, { theme: props.theme, root: target, layout });

onBeforeUnmount(() => layout.destroy());

function rootNode(): ShadowRoot | Document {
	return host.value?.shadowRoot ?? document;
}

if (shell) {
	provide<PanelShell>(PANEL_SHELL, {
		...shell,
		onKey: handler => shell.onKey(event => props.active && handler(event)),
	});
}

onMounted(() => {
	const element = host.value;
	if (!element) return;
	const root = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
	root.adoptedStyleSheets = [sheetFor(props.theme)];
	const mountPoint = document.createElement('div');
	mountPoint.className = 'theme-root';
	root.append(mountPoint);
	target.value = mountPoint;
});

defineExpose({ host });
</script>

<template>
	<div
		ref="host"
		:class="part === 'panel' ? ['popup__theme', { 'popup__theme--overlay': overlay }] : 'popup__overlay'"
		:data-theme="theme.id"
		:inert="part === 'panel' && !active ? true : undefined"
		:aria-hidden="part === 'panel' && !active ? 'true' : undefined"
	>
		<Teleport v-if="target" :to="target">
			<EnvironmentProvider :value="rootNode">
				<component :is="part === 'panel' ? theme.panel : theme.tooltip" />
			</EnvironmentProvider>
		</Teleport>
	</div>
</template>
