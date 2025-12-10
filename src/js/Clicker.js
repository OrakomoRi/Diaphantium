import { getStorage, setStorage } from './storage.js';
import { $, on } from './utils.js';
import PacketClicker from './PacketClicker.js';

export default class Clicker {
	constructor(popup) {
		this.popup = popup;
		this.keys = [];
		this.antiAfkToggle = true;
		this.packetClicker = null;
		this.clickerMode = 'packet'; // 'packet' or 'emulation'

		// Mapping between feature names and checkbox class names
		this.checkboxMap = {
			supplies: 'supplies',
			antiAfk: 'anti_afk',
			autoDelete: 'auto_delete'
		};

		this.features = {
			supplies: {
				enabled: false,
				storageKey: 'Diaphantium.clickSuppliesState',
				action: () => {
					if (this.clickerMode === 'packet' && this.packetClicker) {
						this.updateKeys();
						this.keys.forEach(key => this.packetClicker.clickSupply(key));
					} else {
						this.updateKeys();
						this.keys.forEach(key => this.simulateKeyPress(key));
					}
				},
				scheduler: (fn) => requestAnimationFrame(fn)
			},
			mines: {
				enabled: false,
				storageKey: null,
				action: () => {
					// console.log('[Clicker] Mines action, mode:', this.clickerMode, 'packetClicker:', !!this.packetClicker);
					if (this.clickerMode === 'packet' && this.packetClicker) {
						this.packetClicker.clickSupply('5');
					} else {
						this.simulateKeyPress('5');
					}
				},
				scheduler: (fn) => setTimeout(fn, getStorage('mineDelay') || 100)
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
		this.initializePacketClicker();
		this.loadClickerMode();
		this.setupHotkeys();
		this.setupCheckboxListeners();
		this.loadState();
	}

	async initializePacketClicker() {
		this.packetClicker = new PacketClicker();
		const success = await this.packetClicker.init();
		// console.log('[Clicker] PacketClicker initialized:', success);
	}

	loadClickerMode() {
		const savedMode = getStorage('Diaphantium.clickerMode');
		this.clickerMode = savedMode || 'packet';
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
		// Event delegation - single listener for all checkboxes
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
		const clickValues = getStorage('clickValues') || [];
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

	setClickerMode(mode) {
		if (mode !== 'packet' && mode !== 'emulation') {
			return;
		}

		this.clickerMode = mode;
		setStorage('Diaphantium.clickerMode', mode);
	}
}
