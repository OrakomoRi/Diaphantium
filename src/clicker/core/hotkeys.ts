import { getStorage } from '../storage/storage';
import { DEFAULT_OPEN_HOTKEY, HOTKEY_ACTIONS } from '../config/config';

export interface HotkeyHandlers {
	openMenu: () => void;
	clickSupplies: () => void;
	clickMines: () => void;
}

function savedCode(action: string): string | undefined {
	return (getStorage('hotkeys') || []).find(hotkey => hotkey.action === action)?.value;
}

export function openMenuCode(): string {
	return savedCode(HOTKEY_ACTIONS.openMenu) || DEFAULT_OPEN_HOTKEY;
}

export function installHotkeys(handlers: HotkeyHandlers): () => void {
	function onKeydown(event: KeyboardEvent): void {
		if (!event.isTrusted || (event.target as Element | null)?.tagName === 'INPUT') return;

		const bindings: Array<[string | undefined, () => void]> = [
			[openMenuCode(), handlers.openMenu],
			[savedCode(HOTKEY_ACTIONS.clickSupplies), handlers.clickSupplies],
			[savedCode(HOTKEY_ACTIONS.clickMines), handlers.clickMines],
		];

		for (const [code, handler] of bindings) {
			if (code === event.code) {
				event.preventDefault();
				handler();
			}
		}

		if (event.code === 'F5') location.reload();
	}

	document.addEventListener('keydown', onKeydown);
	return () => document.removeEventListener('keydown', onKeydown);
}
