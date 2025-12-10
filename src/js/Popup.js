import { $, $$, on, debounce } from './utils.js';
import { getStorage, setStorage, updateConfig } from './storage.js';
import ElementMover from './ElementMover.js';
import popupHTML from '../html/popup.html';

export default class Popup {
	constructor() {
		this.selector = '.popup_container.diaphantium[author="OrakomoRi"] .popup';
		this.isOpen = false;
		this.lockedElement = null;
		this.popup = null; // Cache popup element
		this.debouncedSave = debounce(() => this.saveAllSettings(), 500);

		this.setupListeners();
	}

	setupListeners() {
		// Hotkey to toggle popup
		on(document, 'keydown', (e) => {
			const hotkeys = getStorage('Diaphantium.hotkeys') || [];
			const openHotkey = hotkeys.find(h => h.action === 'Open menu');
			const code = openHotkey?.value || 'Slash';

			if (e.code === code && e.target.tagName !== 'INPUT') {
				e.preventDefault();
				this.toggle();
			}
		});

		// Mobile support removed

		// Click outside popup to close
		on(document, 'click', (e) => {
			if (!this.isOpen) return;

			const popup = e.target.closest('.popup_container.diaphantium[author="OrakomoRi"] .popup');
			const container = e.target.closest('.popup_container.diaphantium[author="OrakomoRi"]');

			// Blur inputs if clicked outside of them
			if (popup && !e.target.closest('input')) {
				const activeElement = document.activeElement;
				if (activeElement && activeElement.tagName === 'INPUT' && popup.contains(activeElement)) {
					activeElement.blur();
				}
			}

			// Close if clicked on container but not on popup itself
			if (container && !popup) {
				this.hide();
			}
		});
	}

	show() {
		if (this.isOpen) return;

		// Add popup to page
		document.body.insertAdjacentHTML('beforeend', popupHTML);

		this.popup = $(this.selector);
		if (!this.popup) return;
		const popup = this.popup;

		// Load position
		const coords = getStorage('Diaphantium.coordinates');
		if (coords) {
			popup.style.top = `${coords.top}px`;
			popup.style.left = `${coords.left}px`;
		}

		// Make draggable - drag by entire popup
		new ElementMover(popup);

		// Setup close button
		on($('.close', popup), 'click', () => this.hide());

		// Setup tabs
		this.setupTabs();
		this.initTab('clicker');

		// Setup all UI functionality
		this.setupSupplyIcons();
		this.setupSupplyCheckbox();
		this.setupMineDelay();
		this.setupMiscellaneous();
		this.setupHotkeys();
		this.setupSignature();
		this.setupClickerMode();

		// Store pointer lock (only if element is valid and in DOM)
		this.lockedElement = document.pointerLockElement;
		if (this.lockedElement && document.contains(this.lockedElement)) {
			if (document.exitPointerLock) {
				try {
					document.exitPointerLock();
				} catch (e) {
					// Silently ignore
				}
			}
		}

		on(popup, 'focus', (e) => {
			e.stopPropagation();
		});

		on(popup, 'keydown', (e) => {
			e.stopPropagation();
		});

		// Block page scroll
		this.blockPageScroll();

		this.isOpen = true;
	}

	hide() {
		if (!this.isOpen) return;

		const popup = this.popup;
		if (!popup) return;

		// Batch save all settings at once
		const updates = {};
		
		updates.coordinates = {
			top: parseFloat(popup.style.top),
			left: parseFloat(popup.style.left)
		};

		const delayInput = $('.text_input.delay', popup);
		if (delayInput && /^\d+$/.test(delayInput.value)) {
			updates.mineDelay = parseInt(delayInput.value, 10);
		}

		updateConfig(updates);

		// Remove popup
		$('.popup_container.diaphantium[author="OrakomoRi"]')?.remove();
		this.popup = null; // Clear cache

		// Restore pointer lock (check if element is still in DOM)
		if (this.lockedElement?.requestPointerLock && document.contains(this.lockedElement)) {
			try {
				this.lockedElement.requestPointerLock();
			} catch (e) {
				// Silently ignore if pointer lock fails (element may have been removed)
			}
		}

		// Unblock page scroll
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

		// Tab click
		$$('.navigation .item', popup).forEach(item => {
			on(item, 'click', () => {
				const tab = item.getAttribute('data-tab');
				this.initTab(tab);
			});

			// Keyboard navigation
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

		// Hide all tabs
		$$('.content', popup).forEach(c => c.classList.remove('active'));

		// Show selected
		$(`.content[data-tab="${tabName}"]`, popup)?.classList.add('active');

		// Update nav
		$$('.navigation .item', popup).forEach(item => {
			item.classList.remove('active');
			item.removeAttribute('tabindex');
		});

		$(`.navigation .item[data-tab="${tabName}"]`, popup)?.classList.add('active');

		$$('.navigation .item:not(.active)', popup).forEach(item => {
			item.setAttribute('tabindex', '0');
		});
	}

	// Setup supply icon clicks (toggle on/off)
	setupSupplyIcons() {
		const popup = this.popup;
		if (!popup) return;

		const supplies = $$('.supply', popup);

		// Load saved values
		const clickValues = getStorage('Diaphantium.clickValues') || [];

		supplies.forEach(supply => {
			const key = supply.getAttribute('data-key');

			// Set initial state
			const saved = clickValues.find(v => v.key === key);
			const state = saved?.value || 'off';
			supply.setAttribute('data-state', state);

			// Click to toggle
			on(supply, 'click', () => {
				const currentState = supply.getAttribute('data-state');
				const newState = currentState === 'on' ? 'off' : 'on';
				supply.setAttribute('data-state', newState);
				this.saveClickValues();
			});
		});

		// Save if no values exist
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

		setStorage('Diaphantium.clickValues', values);
	}

	// Setup supply clicker checkbox
	setupSupplyCheckbox() {
		const popup = this.popup;
		if (!popup) return;

		const checkbox = $('.checkbox.supplies', popup);
		if (!checkbox) return;

		// Load state
		const state = getStorage('Diaphantium.clickSuppliesState');
		if (state === true) {
			checkbox.checked = true;
		}
	}

	// Setup mine delay input
	setupMineDelay() {
		const popup = this.popup;
		if (!popup) return;

		const delayInput = $('.text_input.delay', popup);
		if (!delayInput) return;

		// Load saved value
		const saved = getStorage('mineDelay');
		const value = saved || 100;
		delayInput.value = value;

		let previousValue = value;

		// Click to focus
		on(delayInput, 'click', () => delayInput.focus());

		// Blur on Enter
		on(delayInput, 'keydown', (e) => {
			if (e.code === 'Enter') {
				delayInput.blur();
			}
		});

		// Validate and save on change
		on(delayInput, 'change', () => {
			const newValue = delayInput.value;

			if (!/^\d+$/.test(newValue)) {
				// Invalid input - show error
				delayInput.classList.add('wrong_input');
				setTimeout(() => {
					delayInput.classList.remove('wrong_input');
					delayInput.value = previousValue;
				}, 200);
			} else {
				// Valid - save
				previousValue = newValue;
				setStorage('mineDelay', parseInt(newValue, 10));
			}
		});
	}

	// Setup miscellaneous checkboxes (Anti-AFK and Auto-delete)
	setupMiscellaneous() {
		const popup = this.popup;
		if (!popup) return;

		// Anti-AFK checkbox
		const antiAfkCheckbox = $('.checkbox.anti_afk', popup);
		if (antiAfkCheckbox) {
			antiAfkCheckbox.checked = getStorage('antiAfkState') === true;
		}

		// Auto-delete checkbox
		const autoDeleteCheckbox = $('.checkbox.auto_delete', popup);
		if (autoDeleteCheckbox) {
			autoDeleteCheckbox.checked = getStorage('autoDeleteState') === true;
		}
	}

	// Setup hotkey inputs
	setupHotkeys() {
		const popup = this.popup;
		if (!popup) return;

		const hotkeyInputs = $$('.hotkey', popup);

		// Load saved hotkeys
		const savedHotkeys = getStorage('Diaphantium.hotkeys') || [];

		hotkeyInputs.forEach(input => {
			const action = input.getAttribute('data-action');

			// Set initial value
			const saved = savedHotkeys.find(h => h.action === action);
			if (saved) {
				input.value = saved.value;
				input.setAttribute('data-code', saved.value);
			} else if (action === 'Open menu') {
				input.value = 'Slash';
				input.setAttribute('data-code', 'Slash');
			}

			// Click to focus
			on(input, 'click', () => input.focus());

			// Capture key press
			on(input, 'keydown', (e) => {
				e.preventDefault();
				e.stopPropagation();

				const code = e.code;
				const previousValue = input.value;

				if (code === 'Escape') {
					// Reset to default or clear
					if (action === 'Open menu') {
						input.value = 'Slash';
						input.setAttribute('data-code', 'Slash');
					} else {
						input.value = '';
						input.removeAttribute('data-code');
					}
				} else {
					// Check if key is in restricted range (Digit1-5)
					const isRestricted = /^Digit[1-5]$/.test(code);

					if (isRestricted) {
						// Show error
						input.classList.add('wrong_input');
						setTimeout(() => {
							input.classList.remove('wrong_input');
							input.value = previousValue;
						}, 200);
					} else {
						// Accept key
						input.value = code;
						input.setAttribute('data-code', code);
					}
				}

				input.blur();
				this.updateHotkeyClasses();
				this.saveHotkeys();
			});
		});

		// Setup refresh buttons
		$$('.refresh_hotkey', popup).forEach(btn => {
			on(btn, 'click', () => {
				const action = btn.getAttribute('data-action');
				const input = $(`.hotkey[data-action="${action}"]`, popup);

				if (input) {
					if (action === 'Open menu') {
						input.value = 'Slash';
						input.setAttribute('data-code', 'Slash');
					} else {
						input.value = '';
						input.removeAttribute('data-code');
					}

					this.updateHotkeyClasses();
					this.saveHotkeys();
				}
			});
		});

		// Save if no hotkeys exist
		if (savedHotkeys.length === 0) {
			this.saveHotkeys();
		}

		// Update classes initially
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

		setStorage('Diaphantium.hotkeys', hotkeys);
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

	// Setup signature visibility toggle
	setupSignature() {
		const popup = this.popup;
		if (!popup) return;

		const checkbox = $('.checkbox.show_signature', popup);
		const signature = $('.popup_signature', popup.parentElement);

		if (!checkbox || !signature) return;

		// Load saved state (default: true - shown)
		const showSignature = getStorage('Diaphantium.showSignature');
		if (showSignature === false) {
			checkbox.checked = false;
			signature.classList.add('hidden');
		} else {
			checkbox.checked = true;
			signature.classList.remove('hidden');
		}

		// Toggle on change
		on(checkbox, 'change', () => {
			const isChecked = checkbox.checked;
			
			if (isChecked) {
				signature.classList.remove('hidden');
			} else {
				signature.classList.add('hidden');
			}

			setStorage('Diaphantium.showSignature', isChecked);
		});
	}

	// Setup clicker mode selection
	setupClickerMode() {
		const popup = this.popup;
		if (!popup) return;

		const checkbox = $('.checkbox.packet_mode', popup);
		if (!checkbox) return;

		// Load saved state (default: packet)
		const savedMode = getStorage('Diaphantium.clickerMode') || 'packet';
		checkbox.checked = savedMode === 'packet';

		// Change mode on toggle
		on(checkbox, 'change', () => {
			const mode = checkbox.checked ? 'packet' : 'emulation';
			setStorage('Diaphantium.clickerMode', mode);
			
			// Notify clicker instance if available
			if (window.clickerInstance) {
				window.clickerInstance.setClickerMode(mode);
			}

			// console.log('[Popup] Clicker mode changed to:', mode);
		});
	}

	// Batch save all settings (used by debounced save)
	saveAllSettings() {
		if (!this.popup) return;

		const updates = {};

		// Save mine delay
		const delayInput = $('.text_input.delay', this.popup);
		if (delayInput && /^\d+$/.test(delayInput.value)) {
			updates.mineDelay = parseInt(delayInput.value, 10);
		}

		updateConfig(updates);
	}

	// Block page scroll when popup is open
	blockPageScroll() {
		// Add class to block scroll on both html and body
		document.documentElement.classList.add('diaphantium-popup-open');
		document.body.classList.add('diaphantium-popup-open');
	}

	// Unblock page scroll when popup is closed
	unblockPageScroll() {
		// Remove class from both html and body
		document.documentElement.classList.remove('diaphantium-popup-open');
		document.body.classList.remove('diaphantium-popup-open');
	}
}
