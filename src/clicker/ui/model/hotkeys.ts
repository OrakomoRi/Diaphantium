import { computed, onMounted, reactive } from 'vue';
import { DEFAULT_OPEN_HOTKEY, HOTKEY_ACTIONS } from '../../config/config';
import { getStorage, setStorage } from '../../storage/storage';

export type HotkeyAction = typeof HOTKEY_ACTIONS[keyof typeof HOTKEY_ACTIONS];

export interface HotkeyState {
	action: HotkeyAction;
	label: 'settings.openMenu' | 'settings.clickSupplies' | 'settings.clickMines';
	hint: 'tooltips.openMenu' | 'tooltips.clickSuppliesHotkey' | 'tooltips.clickMinesHotkey';
	code: string | undefined;
}

export type AssignResult = 'assigned' | 'reserved' | 'reset';

export const RESERVED_CODES: readonly string[] = [
	'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
	'KeyW', 'KeyA', 'KeyS', 'KeyD',
	'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
	'Space', 'Delete',
];

function defaultCode(action: HotkeyAction): string | undefined {
	return action === HOTKEY_ACTIONS.openMenu ? DEFAULT_OPEN_HOTKEY : undefined;
}

export function useHotkeySettings() {
	const saved = getStorage('hotkeys') || [];

	function initialCode(action: HotkeyAction): string | undefined {
		const entry = saved.find(hotkey => hotkey.action === action);
		return entry ? entry.value : defaultCode(action);
	}

	const hotkeys = reactive<HotkeyState[]>([
		{ action: HOTKEY_ACTIONS.openMenu, label: 'settings.openMenu', hint: 'tooltips.openMenu', code: initialCode(HOTKEY_ACTIONS.openMenu) },
		{ action: HOTKEY_ACTIONS.clickSupplies, label: 'settings.clickSupplies', hint: 'tooltips.clickSuppliesHotkey', code: initialCode(HOTKEY_ACTIONS.clickSupplies) },
		{ action: HOTKEY_ACTIONS.clickMines, label: 'settings.clickMines', hint: 'tooltips.clickMinesHotkey', code: initialCode(HOTKEY_ACTIONS.clickMines) },
	]);

	const duplicateCodes = computed(() => {
		const codes = hotkeys.map(hotkey => hotkey.code).filter((code): code is string => Boolean(code));
		return new Set(codes.filter(code => codes.filter(other => other === code).length > 1));
	});

	function save(): void {
		setStorage('hotkeys', hotkeys
			.filter((hotkey): hotkey is HotkeyState & { code: string } => Boolean(hotkey.code))
			.map(hotkey => ({ action: hotkey.action, value: hotkey.code })));
	}

	function reset(hotkey: HotkeyState): void {
		hotkey.code = defaultCode(hotkey.action);
		save();
	}

	function assign(hotkey: HotkeyState, code: string): AssignResult {
		if (code === 'Escape') {
			reset(hotkey);
			return 'reset';
		}
		if (RESERVED_CODES.includes(code)) {
			save();
			return 'reserved';
		}
		hotkey.code = code;
		save();
		return 'assigned';
	}

	function isDuplicate(hotkey: HotkeyState): boolean {
		return hotkey.code !== undefined && duplicateCodes.value.has(hotkey.code);
	}

	function isDefault(hotkey: HotkeyState): boolean {
		return hotkey.code === defaultCode(hotkey.action);
	}

	onMounted(() => {
		if (saved.length === 0) save();
	});

	return { hotkeys, assign, reset, isDuplicate, isDefault };
}
