import { getStorage, setStorage } from './storage.js';
import { $, on } from './utils.js';

export default class Clicker {
	constructor(popup) {
		this.popup = popup;
		this.keys = [];
		this.antiAfkToggle = true;

		this.features = {
			supplies: {
				enabled: false,
				storageKey: 'Diaphantium.clickSuppliesState',
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
				scheduler: (fn) => setTimeout(fn, getStorage('Diaphantium.mine_delay')?.[0] || 100)
			},
			antiAfk: {
				enabled: false,
				storageKey: 'Diaphantium.antiAfkState',
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
				storageKey: 'Diaphantium.autoDeleteState',
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
			'Click supplies': 'supplies',
			'Click mines': 'mines'
		};

		on(document, 'keydown', (e) => {
			if (e.target.tagName === 'INPUT') return;

			const hotkeys = getStorage('Diaphantium.hotkeys') || [];

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
		const checkboxMap = {
			'.checkbox.supplies': 'supplies',
			'.checkbox.anti_afk': 'antiAfk',
			'.checkbox.auto_delete': 'autoDelete'
		};

		on(document, 'change', (e) => {
			Object.entries(checkboxMap).forEach(([selector, feature]) => {
				if (e.target.matches(selector)) this.toggle(feature);
			});
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
		const uiMap = {
			supplies: { checkbox: '.checkbox.supplies', icon: '.diaphantium_mobile.icon.supplies[author="OrakomoRi"]' },
			antiAfk: { checkbox: '.checkbox.anti_afk', icon: null },
			autoDelete: { checkbox: '.checkbox.auto_delete', icon: null },
			mines: { checkbox: null, icon: '.diaphantium_mobile.icon.mines[author="OrakomoRi"]' }
		};

		Object.entries(uiMap).forEach(([feature, { checkbox, icon }]) => {
			const enabled = this.features[feature].enabled;
			if (checkbox) {
				const el = $(checkbox);
				if (el) el.checked = enabled;
			}
			if (icon) {
				const el = $(icon);
				if (el) el.classList.toggle('active', enabled);
			}
		});
	}

	updateKeys() {
		this.keys = (getStorage('Diaphantium.clickValues') || [])
			.filter(item => item.value === 'on')
			.map(item => item.key);
	}

	simulateKeyPress(key, options = {}) {
		const config = this.keyMap[key] || {
			code: `Digit${key}`,
			keyCode: key.charCodeAt(0)
		};

		const createEvent = (type) => new KeyboardEvent(type, {
			bubbles: true,
			cancelable: true,
			key,
			code: config.code,
			keyCode: config.keyCode,
			which: config.keyCode
		});

		if (options.downOnly) {
			document.dispatchEvent(createEvent('keydown'));
		} else if (options.upOnly) {
			document.dispatchEvent(createEvent('keyup'));
		} else {
			document.dispatchEvent(createEvent('keydown'));
			document.dispatchEvent(createEvent('keyup'));
		}
	}

	loadState() {
		Object.entries(this.features).forEach(([feature, config]) => {
			if (config.storageKey && getStorage(config.storageKey) === true) {
				this.start(feature);
			}
		});
	}
}
