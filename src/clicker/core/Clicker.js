import { getStorage, setStorage } from '../storage/storage.js';
import { $, on } from '../utils/utils.js';
import { STORAGE_KEYS, CHECKBOX_CLASSES, HOTKEY_ACTIONS, DEFAULT_MINE_DELAY } from '../config/config.js';

export default class Clicker {
	constructor(popup) {
		this.popup = popup;
		this.keys = [];
		this.antiAfkToggle = true;

		this.checkboxMap = {
			supplies: CHECKBOX_CLASSES.supplies,
			antiAfk: CHECKBOX_CLASSES.antiAfk,
			autoDelete: CHECKBOX_CLASSES.autoDelete
		};

		this.features = {
			supplies: {
				enabled: false,
				storageKey: STORAGE_KEYS.clickSuppliesState,
				action: () => {
					this.updateKeys();
					this.keys.forEach(key => this.simulateKeyPress(key));
				},
				scheduler: (fn) => requestAnimationFrame(fn)
			},
			mines: {
				enabled: false,
				storageKey: null,
				action: () => this.simulateKeyPress('5'),
				scheduler: (fn) => setTimeout(fn, getStorage(STORAGE_KEYS.mineDelay) ?? DEFAULT_MINE_DELAY)
			},
			antiAfk: {
				enabled: false,
				storageKey: STORAGE_KEYS.antiAfkState,
				action: () => {
					this.antiAfkToggle = !this.antiAfkToggle;
					const key = this.antiAfkToggle ? 'ArrowLeft' : 'ArrowRight';
					this.simulateKeyPress(key, { downOnly: true });
					const holdTime = 50 + Math.floor(Math.random() * 51);
					setTimeout(() => this.simulateKeyPress(key, { upOnly: true }), holdTime);
				},
				scheduler: (fn) => setTimeout(fn, 800 + Math.floor(Math.random() * 701))
			},
			autoDelete: {
				enabled: false,
				storageKey: STORAGE_KEYS.autoDeleteState,
				action: () => this.simulateKeyPress('Delete'),
				scheduler: (fn) => requestAnimationFrame(fn)
			}
		};

		this.keyMap = {
			'ArrowLeft': { code: 'ArrowLeft', keyCode: 37 },
			'ArrowRight': { code: 'ArrowRight', keyCode: 39 },
			'Delete': { code: 'Delete', keyCode: 46 }
		};

		this.init();
	}

	init() {
		this.setupHotkeys();
		this.setupCheckboxListeners();
		this.loadState();
	}

	setupHotkeys() {
		const hotkeyMap = {
			[HOTKEY_ACTIONS.clickSupplies]: 'supplies',
			[HOTKEY_ACTIONS.clickMines]: 'mines'
		};

		on(document, 'keydown', (e) => {
			if (e.target.tagName === 'INPUT') return;

			const hotkeys = getStorage(STORAGE_KEYS.hotkeys) || [];

			Object.entries(hotkeyMap).forEach(([action, feature]) => {
				const hotkey = hotkeys.find(h => h.action === action);
				if (hotkey && e.code === hotkey.value) {
					e.preventDefault();
					this.toggle(feature);
				}
			});

			if (e.code === 'F5') location.reload();
		});
	}

	setupCheckboxListeners() {
		on(document, 'change', (e) => {
			if (!e.target.classList.contains('checkbox')) return;

			for (const [feature, className] of Object.entries(this.checkboxMap)) {
				if (e.target.classList.contains(className)) {
					this.toggle(feature);
					break;
				}
			}
		});
	}

	toggle(feature) {
		this.features[feature].enabled ? this.stop(feature) : this.start(feature);
	}

	start(feature) {
		const feat = this.features[feature];
		feat.enabled = true;
		if (feat.storageKey) setStorage(feat.storageKey, true);
		this.updateUIState();
		this.runLoop(feature);
	}

	stop(feature) {
		const feat = this.features[feature];
		feat.enabled = false;
		if (feat.storageKey) setStorage(feat.storageKey, false);
		this.updateUIState();
	}

	runLoop(feature) {
		const feat = this.features[feature];
		if (!feat.enabled) return;
		feat.action();
		feat.scheduler(() => this.runLoop(feature));
	}

	updateUIState() {
		for (const [feature, className] of Object.entries(this.checkboxMap)) {
			const checkbox = $(`.checkbox.${className}`);
			if (checkbox) checkbox.checked = this.features[feature].enabled;
		}
	}

	updateKeys() {
		const clickValues = getStorage(STORAGE_KEYS.clickValues) || [];
		this.keys = clickValues
			.filter(item => item.value === 'on')
			.map(item => item.key);
	}

	simulateKeyPress(key, options = {}) {
		const config = this.keyMap[key] || {
			code: `Digit${key}`,
			keyCode: key.charCodeAt(0)
		};

		const eventConfig = {
			bubbles: true,
			cancelable: true,
			key,
			code: config.code,
			keyCode: config.keyCode,
			which: config.keyCode
		};

		if (options.downOnly) {
			document.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
		} else if (options.upOnly) {
			document.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
		} else {
			document.dispatchEvent(new KeyboardEvent('keydown', eventConfig));
			document.dispatchEvent(new KeyboardEvent('keyup', eventConfig));
		}
	}

	loadState() {
		for (const [feature, config] of Object.entries(this.features)) {
			if (config.storageKey && getStorage(config.storageKey) === true) {
				this.start(feature);
			}
		}
	}
}
