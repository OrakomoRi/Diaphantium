import { $, $$, on, debounce } from '../utils/utils.js';
import { getStorage, setStorage, updateConfig } from '../storage/storage.js';
import { STORAGE_KEYS, CHECKBOX_CLASSES, POPUP_SELECTOR, POPUP_INNER_SELECTOR, POPUP_OPEN_CLASS, HOTKEY_ACTIONS, DEFAULT_OPEN_HOTKEY, DEFAULT_MINE_DELAY } from '../config/config.js';
import ElementMover from './ElementMover.js';
import popupHTML from '../assets/html/popup.html';

export default class Popup {
	constructor() {
		this.selector = POPUP_INNER_SELECTOR;
		this.isOpen = false;
		this.lockedElement = null;
		this.popup = null;
		this.debouncedSave = debounce(() => this.saveAllSettings(), 500);

		this.setupListeners();
	}

	setupListeners() {
		on(document, 'keydown', (e) => {
			const hotkeys = getStorage(STORAGE_KEYS.hotkeys) || [];
			const openHotkey = hotkeys.find(h => h.action === HOTKEY_ACTIONS.openMenu);
			const code = openHotkey?.value || DEFAULT_OPEN_HOTKEY;

			if (e.code === code && e.target.tagName !== 'INPUT') {
				e.preventDefault();
				this.toggle();
			}
		});

		on(document, 'click', (e) => {
			if (!this.isOpen) return;

			const popup = e.target.closest(POPUP_INNER_SELECTOR);
			const container = e.target.closest(POPUP_SELECTOR);

			if (popup && !e.target.closest('input')) {
				const activeElement = document.activeElement;
				if (activeElement && activeElement.tagName === 'INPUT' && popup.contains(activeElement)) {
					activeElement.blur();
				}
			}

			if (container && !popup) {
				this.hide();
			}
		});
	}

	show() {
		if (this.isOpen) return;

		document.body.insertAdjacentHTML('beforeend', popupHTML);

		this.popup = $(this.selector);
		if (!this.popup) return;
		const popup = this.popup;
		const coords = getStorage(STORAGE_KEYS.coordinates);
		if (coords) {
			popup.style.top = `${coords.top}px`;
			popup.style.left = `${coords.left}px`;
		}

		new ElementMover(popup);

		on($('.close', popup), 'click', () => this.hide());

		this.setupTabs();
		this.initTab('clicker');

		this.setupSupplyIcons();
		this.setupSupplyCheckbox();
		this.setupMineDelay();
		this.setupMiscellaneous();
		this.setupHotkeys();
		this.setupSignature();

		this.lockedElement = document.pointerLockElement;
		if (this.lockedElement && document.contains(this.lockedElement)) {
			if (document.exitPointerLock) {
				try {
					document.exitPointerLock();
				} catch (e) {}
			}
		}

		on(popup, 'focus', (e) => {
			e.stopPropagation();
		});

		on(popup, 'keydown', (e) => {
			e.stopPropagation();
		});

		this.blockPageScroll();

		this.isOpen = true;
	}

	hide() {
		if (!this.isOpen) return;

		const popup = this.popup;
		if (!popup) return;

		const updates = {};
		
		updates[STORAGE_KEYS.coordinates] = {
			top: parseFloat(popup.style.top),
			left: parseFloat(popup.style.left)
		};

		const delayInput = $('.text_input.delay', popup);
		if (delayInput && /^\d+$/.test(delayInput.value)) {
			updates[STORAGE_KEYS.mineDelay] = parseInt(delayInput.value, 10);
		}

		updateConfig(updates);

		$(POPUP_SELECTOR)?.remove();
		this.popup = null; // Clear cache

		if (this.lockedElement?.requestPointerLock && document.contains(this.lockedElement)) {
			try {
				this.lockedElement.requestPointerLock();
			} catch (e) {}
		}

		this.unblockPageScroll();

		this.isOpen = false;
	}

	toggle() {
		if (this.isOpen) {
			this.hide();
		} else {
			this.show();
		}
	}

	setupTabs() {
		const popup = this.popup;
		if (!popup) return;

		$$('.navigation .item', popup).forEach(item => {
			on(item, 'click', () => {
				const tab = item.getAttribute('data-tab');
				this.initTab(tab);
			});

			on(item, 'keydown', (e) => {
				if (e.code === 'Space' || e.code === 'Enter') {
					e.preventDefault();
					const tab = item.getAttribute('data-tab');
					this.initTab(tab);
				}
			});
		});
	}

	initTab(tabName) {
		const popup = this.popup;
		if (!popup) return;

		$$('.content', popup).forEach(c => c.classList.remove('active'));

		$(`.content[data-tab="${tabName}"]`, popup)?.classList.add('active');

		$$('.navigation .item', popup).forEach(item => {
			item.classList.remove('active');
			item.removeAttribute('tabindex');
		});

		$(`.navigation .item[data-tab="${tabName}"]`, popup)?.classList.add('active');

		$$('.navigation .item:not(.active)', popup).forEach(item => {
			item.setAttribute('tabindex', '0');
		});
	}

	setupSupplyIcons() {
		const popup = this.popup;
		if (!popup) return;

		const supplies = $$('.supply', popup);

		const clickValues = getStorage(STORAGE_KEYS.clickValues) || [];

		supplies.forEach(supply => {
			const key = supply.getAttribute('data-key');

			const saved = clickValues.find(v => v.key === key);
			const state = saved?.value || 'off';
			supply.setAttribute('data-state', state);

			on(supply, 'click', () => {
				const currentState = supply.getAttribute('data-state');
				const newState = currentState === 'on' ? 'off' : 'on';
				supply.setAttribute('data-state', newState);
				this.saveClickValues();
			});
		});

		if (clickValues.length === 0) {
			this.saveClickValues();
		}
	}

	saveClickValues() {
		const popup = this.popup;
		if (!popup) return;

		const values = [];
		$$('.supply', popup).forEach(supply => {
			values.push({
				key: supply.getAttribute('data-key'),
				value: supply.getAttribute('data-state')
			});
		});

		setStorage(STORAGE_KEYS.clickValues, values);
	}

	setupSupplyCheckbox() {
		const popup = this.popup;
		if (!popup) return;

		const checkbox = $(`.checkbox.${CHECKBOX_CLASSES.supplies}`, popup);
		if (!checkbox) return;

		const state = getStorage(STORAGE_KEYS.clickSuppliesState);
		if (state === true) {
			checkbox.checked = true;
		}
	}

	setupMineDelay() {
		const popup = this.popup;
		if (!popup) return;

		const delayInput = $('.text_input.delay', popup);
		if (!delayInput) return;

		const saved = getStorage(STORAGE_KEYS.mineDelay);
		const value = saved ?? DEFAULT_MINE_DELAY;
		delayInput.value = value;

		let previousValue = value;

		on(delayInput, 'click', () => delayInput.focus());

		on(delayInput, 'keydown', (e) => {
			if (e.code === 'Enter') {
				delayInput.blur();
			}
		});

		on(delayInput, 'change', () => {
			const newValue = delayInput.value;

			if (!/^\d+$/.test(newValue)) {
				delayInput.classList.add('wrong_input');
				setTimeout(() => {
					delayInput.classList.remove('wrong_input');
					delayInput.value = previousValue;
				}, 200);
			} else {
				previousValue = newValue;
				setStorage(STORAGE_KEYS.mineDelay, parseInt(newValue, 10));
			}
		});
	}

	setupMiscellaneous() {
		const popup = this.popup;
		if (!popup) return;

		// Anti-AFK checkbox
		const antiAfkCheckbox = $(`.checkbox.${CHECKBOX_CLASSES.antiAfk}`, popup);
		if (antiAfkCheckbox) {
			antiAfkCheckbox.checked = getStorage(STORAGE_KEYS.antiAfkState) === true;
		}

		// Auto-delete checkbox
		const autoDeleteCheckbox = $(`.checkbox.${CHECKBOX_CLASSES.autoDelete}`, popup);
		if (autoDeleteCheckbox) {
			autoDeleteCheckbox.checked = getStorage(STORAGE_KEYS.autoDeleteState) === true;
		}
	}

	setupHotkeys() {
		const popup = this.popup;
		if (!popup) return;

		const hotkeyInputs = $$('.hotkey', popup);

		const savedHotkeys = getStorage(STORAGE_KEYS.hotkeys) || [];

		hotkeyInputs.forEach(input => {
			const action = input.getAttribute('data-action');

			const saved = savedHotkeys.find(h => h.action === action);
			if (saved) {
				input.value = saved.value;
				input.setAttribute('data-code', saved.value);
			} else if (action === HOTKEY_ACTIONS.openMenu) {
				input.value = DEFAULT_OPEN_HOTKEY;
				input.setAttribute('data-code', DEFAULT_OPEN_HOTKEY);
			}

			on(input, 'click', () => input.focus());

			on(input, 'keydown', (e) => {
				e.preventDefault();
				e.stopPropagation();

				const code = e.code;
				const previousValue = input.value;

				if (code === 'Escape') {
					if (action === HOTKEY_ACTIONS.openMenu) {
						input.value = DEFAULT_OPEN_HOTKEY;
						input.setAttribute('data-code', DEFAULT_OPEN_HOTKEY);
					} else {
						input.value = '';
						input.removeAttribute('data-code');
					}
				} else {
					const isRestricted = /^Digit[1-5]$/.test(code);

					if (isRestricted) {
						input.classList.add('wrong_input');
						setTimeout(() => {
							input.classList.remove('wrong_input');
							input.value = previousValue;
						}, 200);
					} else {
						input.value = code;
						input.setAttribute('data-code', code);
					}
				}

				input.blur();
				this.updateHotkeyClasses();
				this.saveHotkeys();
			});
		});

		$$('.refresh_hotkey', popup).forEach(btn => {
			on(btn, 'click', () => {
				const action = btn.getAttribute('data-action');
				const input = $(`.hotkey[data-action="${action}"]`, popup);

				if (input) {
					if (action === HOTKEY_ACTIONS.openMenu) {
						input.value = DEFAULT_OPEN_HOTKEY;
						input.setAttribute('data-code', DEFAULT_OPEN_HOTKEY);
					} else {
						input.value = '';
						input.removeAttribute('data-code');
					}

					this.updateHotkeyClasses();
					this.saveHotkeys();
				}
			});
		});

		if (savedHotkeys.length === 0) {
			this.saveHotkeys();
		}

		this.updateHotkeyClasses();
	}

	saveHotkeys() {
		const popup = this.popup;
		if (!popup) return;

		const hotkeys = [];
		$$('.hotkey', popup).forEach(input => {
			const action = input.getAttribute('data-action');
			const value = input.getAttribute('data-code');

			if (value) {
				hotkeys.push({ action, value });
			}
		});

		setStorage(STORAGE_KEYS.hotkeys, hotkeys);
	}

	updateHotkeyClasses() {
		const popup = this.popup;
		if (!popup) return;

		const inputs = $$('.hotkey', popup);
		const values = Array.from(inputs).map(i => i.getAttribute('data-code')).filter(Boolean);

		inputs.forEach(input => {
			const code = input.getAttribute('data-code');
			input.classList.remove('warning');

			if (code && values.filter(v => v === code).length > 1) {
				input.classList.add('warning');
			}
		});
	}

	setupSignature() {
		const popup = this.popup;
		if (!popup) return;

		const checkbox = $('.checkbox.show_signature', popup);
		const signature = $('.popup_signature', popup.parentElement);

		if (!checkbox || !signature) return;

		const showSignature = getStorage(STORAGE_KEYS.showSignature);
		if (showSignature === false) {
			checkbox.checked = false;
			signature.classList.add('hidden');
		} else {
			checkbox.checked = true;
			signature.classList.remove('hidden');
		}

		on(checkbox, 'change', () => {
			const isChecked = checkbox.checked;
			
			if (isChecked) {
				signature.classList.remove('hidden');
			} else {
				signature.classList.add('hidden');
			}

			setStorage(STORAGE_KEYS.showSignature, isChecked);
		});
	}

	saveAllSettings() {
		if (!this.popup) return;

		const updates = {};

		const delayInput = $('.text_input.delay', this.popup);
		if (delayInput && /^\d+$/.test(delayInput.value)) {
			updates[STORAGE_KEYS.mineDelay] = parseInt(delayInput.value, 10);
		}

		updateConfig(updates);
	}

	blockPageScroll() {
		document.documentElement.classList.add(POPUP_OPEN_CLASS);
		document.body.classList.add(POPUP_OPEN_CLASS);
	}

	unblockPageScroll() {
		document.documentElement.classList.remove(POPUP_OPEN_CLASS);
		document.body.classList.remove(POPUP_OPEN_CLASS);
	}
}
