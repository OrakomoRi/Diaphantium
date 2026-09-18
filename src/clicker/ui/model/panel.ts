import { computed, inject, onBeforeUnmount, onMounted, provide, ref, watch, type InjectionKey, type Ref } from 'vue';
import type { MotionValue } from 'motion';
import { useI18n } from 'petite-vue-i18n';
import { getStorage, setStorage } from '../../storage/storage';
import { hasPlugins } from '../../plugins/registry';
import { createSignatureState, type SignatureState } from './signature';
import type { LayoutMorph } from '../motion/layoutMorph';
import type { Theme } from '../themes/types';
import type { ThemeId } from './theme';

export const TAB_NAMES = ['clicker', 'miscellaneous', 'settings', 'plugins', 'about'] as const;
export type TabName = typeof TAB_NAMES[number];

export function useVisiblePanelTabs(): Readonly<Ref<readonly TabName[]>> {
	return computed(() => (hasPlugins.value ? TAB_NAMES : TAB_NAMES.filter(name => name !== 'plugins')));
}

export type DialogKeyHandler = (event: KeyboardEvent) => boolean;

export interface PanelShell {
	presence: MotionValue<number>;
	closing: Ref<boolean>;
	dragging: Ref<boolean>;
	theme: Readonly<Ref<ThemeId>>;
	viewportHeight: Readonly<Ref<number>>;
	close: () => void;
	selectTheme: (id: string) => void;
	releasePointerFocus: () => void;
	onKey: (handler: DialogKeyHandler) => () => void;
}

export interface PanelState {
	activeTab: Ref<TabName>;
	showSignature: Readonly<Ref<boolean>>;
	signature: SignatureState;
	signatureText: Readonly<Ref<string>>;
	setShowSignature: (value: boolean) => void;
}

export interface ThemeContext {
	theme: Theme;
	root: Readonly<Ref<HTMLElement | null>>;
	layout: LayoutMorph;
}

export const PANEL_SHELL: InjectionKey<PanelShell> = Symbol('panel-shell');
export const THEME_CONTEXT: InjectionKey<ThemeContext> = Symbol('theme-context');

export function useThemeContext(): ThemeContext {
	const context = inject(THEME_CONTEXT);
	if (!context) throw new Error('The theme context is not provided');
	return context;
}
const PANEL_STATE: InjectionKey<PanelState> = Symbol('panel-state');

export function usePanelShell(): PanelShell {
	const shell = inject(PANEL_SHELL);
	if (!shell) throw new Error('The panel shell is not provided');
	return shell;
}

export function useDialogKey(handler: DialogKeyHandler): void {
	const shell = usePanelShell();
	let off: (() => void) | null = null;
	onMounted(() => {
		off = shell.onKey(handler);
	});
	onBeforeUnmount(() => off?.());
}

export function providePanelState(): PanelState {
	const { t } = useI18n({ useScope: 'global' });
	const text = computed(() => t('signature'));
	const signature = createSignatureState(getStorage('showSignature') !== false, () => text.value);
	const state: PanelState = {
		activeTab: ref<TabName>('clicker'),
		showSignature: signature.visible,
		signature,
		signatureText: text,
		setShowSignature(value) {
			signature.show(value);
			setStorage('showSignature', value);
		},
	};
	watch(text, () => signature.refresh());
	watch(hasPlugins, has => {
		if (!has && state.activeTab.value === 'plugins') state.activeTab.value = 'clicker';
	});
	onBeforeUnmount(() => signature.destroy());
	provide(PANEL_STATE, state);
	return state;
}

export function usePanelState(): PanelState {
	const state = inject(PANEL_STATE);
	if (!state) throw new Error('The panel state is not provided');
	return state;
}
