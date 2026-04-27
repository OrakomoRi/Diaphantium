import { HOTKEY_STORAGE_KEY } from '../config.js';

export function loadHotkey() {
	try {
		const data = localStorage.getItem(HOTKEY_STORAGE_KEY);
		let hotkey = 'Slash';

		if (data) {
			const hotkeys = JSON.parse(data);
			hotkey = hotkeys[0]?.value || 'Slash';
		}

		const display = hotkey === 'Slash' ? '/' : hotkey;

		const el = document.querySelector('.hotkey-key');
		if (el) el.textContent = display;

		const elInline = document.querySelector('.hotkey-key-inline');
		if (elInline) elInline.textContent = display;
	} catch (e) {
		console.warn('Failed to load hotkey:', e);
	}
}
