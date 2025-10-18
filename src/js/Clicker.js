import { getStorage, setStorage } from './storage.js';
import { $, on } from './utils.js';

export default class Clicker {
	constructor(popup) {
		this.popup = popup;
		this.suppliesEnabled = false;
		this.minesEnabled = false;
		this.antiAfkEnabled = false;
		this.autoDeleteEnabled = false;
		this.keys = [];
		this.antiAfkToggle = true; // для переключения между ArrowLeft и ArrowRight

		this.init();
	}

	init() {
		this.setupHotkeys();
		this.setupCheckboxListeners();
		this.loadState();
	}

	setupHotkeys() {
		on(document, 'keydown', (e) => {
			if (e.target.tagName === 'INPUT') return;

			const hotkeys = getStorage('Diaphantium.hotkeys') || [];

			// Supplies hotkey
			const suppliesHotkey = hotkeys.find(h => h.action === 'Click supplies');
			if (suppliesHotkey && e.code === suppliesHotkey.value) {
				e.preventDefault();
				this.toggleSupplies();
			}

			// Mines hotkey
			const minesHotkey = hotkeys.find(h => h.action === 'Click mines');
			if (minesHotkey && e.code === minesHotkey.value) {
				e.preventDefault();
				this.toggleMines();
			}

			// F5 reload
			if (e.code === 'F5') {
				location.reload();
			}
		});
	}

	setupCheckboxListeners() {
		// Listen for checkbox changes in popup
		on(document, 'change', (e) => {
			if (e.target.matches('.checkbox.supplies')) {
				this.toggleSupplies();
			}
			if (e.target.matches('.checkbox.anti_afk')) {
				this.toggleAntiAfk();
			}
			if (e.target.matches('.checkbox.auto_delete')) {
				this.toggleAutoDelete();
			}
		});
	}

	toggleSupplies() {
		if (this.suppliesEnabled) {
			this.stopSupplies();
		} else {
			this.startSupplies();
		}
	}

	toggleMines() {
		if (this.minesEnabled) {
			this.stopMines();
		} else {
			this.startMines();
		}
	}

	toggleAntiAfk() {
		if (this.antiAfkEnabled) {
			this.stopAntiAfk();
		} else {
			this.startAntiAfk();
		}
	}

	toggleAutoDelete() {
		if (this.autoDeleteEnabled) {
			this.stopAutoDelete();
		} else {
			this.startAutoDelete();
		}
	}

	startSupplies() {
		this.suppliesEnabled = true;
		setStorage('Diaphantium.clickSuppliesState', true);
		this.updateUIState();
		this.clickSuppliesLoop();
	}

	stopSupplies() {
		this.suppliesEnabled = false;
		setStorage('Diaphantium.clickSuppliesState', false);
		this.updateUIState();
	}

	startMines() {
		this.minesEnabled = true;
		this.updateUIState();
		this.clickMinesLoop();
	}

	stopMines() {
		this.minesEnabled = false;
		this.updateUIState();
	}

	startAntiAfk() {
		this.antiAfkEnabled = true;
		setStorage('Diaphantium.antiAfkState', true);
		this.updateUIState();
		this.antiAfkLoop();
	}

	stopAntiAfk() {
		this.antiAfkEnabled = false;
		setStorage('Diaphantium.antiAfkState', false);
		this.updateUIState();
	}

	startAutoDelete() {
		this.autoDeleteEnabled = true;
		setStorage('Diaphantium.autoDeleteState', true);
		this.updateUIState();
		this.autoDeleteLoop();
	}

	stopAutoDelete() {
		this.autoDeleteEnabled = false;
		setStorage('Diaphantium.autoDeleteState', false);
		this.updateUIState();
	}

	updateUIState() {
		// Update checkbox
		const checkbox = $('.checkbox.supplies');
		if (checkbox) {
			checkbox.checked = this.suppliesEnabled;
		}

		// Update anti-AFK checkbox
		const antiAfkCheckbox = $('.checkbox.anti_afk');
		if (antiAfkCheckbox) {
			antiAfkCheckbox.checked = this.antiAfkEnabled;
		}

		// Update auto-delete checkbox
		const autoDeleteCheckbox = $('.checkbox.auto_delete');
		if (autoDeleteCheckbox) {
			autoDeleteCheckbox.checked = this.autoDeleteEnabled;
		}

		// Update mobile icon (supplies)
		const suppliesIcon = $('.diaphantium_mobile.icon.supplies[author="OrakomoRi"]');
		if (suppliesIcon) {
			if (this.suppliesEnabled) {
				suppliesIcon.classList.add('active');
			} else {
				suppliesIcon.classList.remove('active');
			}
		}

		// Update mobile icon (mines)
		const minesIcon = $('.diaphantium_mobile.icon.mines[author="OrakomoRi"]');
		if (minesIcon) {
			if (this.minesEnabled) {
				minesIcon.classList.add('active');
			} else {
				minesIcon.classList.remove('active');
			}
		}
	}

	clickSuppliesLoop() {
		if (!this.suppliesEnabled) return;

		this.updateKeys();
		this.keys.forEach(key => this.simulateKey(key));

		requestAnimationFrame(() => this.clickSuppliesLoop());
	}

	clickMinesLoop() {
		if (!this.minesEnabled) return;

		this.simulateKey('5');

		const delay = getStorage('Diaphantium.mine_delay')?.[0] || 100;
		setTimeout(() => this.clickMinesLoop(), delay);
	}

	antiAfkLoop() {
		if (!this.antiAfkEnabled) return;

		// Toggle between ArrowLeft and ArrowRight each time
		this.antiAfkToggle = !this.antiAfkToggle;
		const key = this.antiAfkToggle ? 'ArrowLeft' : 'ArrowRight';

		// Hold key for a very short time (50-100 ms)
		this.simulateArrowKeyDown(key);
		const holdTime = 50 + Math.floor(Math.random() * 51); // 50-100 ms
		setTimeout(() => {
			this.simulateArrowKeyUp(key);
		}, holdTime);

		// Next press after 0.8-1.5 seconds
		const nextDelay = 800 + Math.floor(Math.random() * 701); // 800-1500 ms
		setTimeout(() => this.antiAfkLoop(), nextDelay);
	}

	autoDeleteLoop() {
		if (!this.autoDeleteEnabled) return;

		this.simulateDeleteKey();

		requestAnimationFrame(() => this.autoDeleteLoop());
	}

	updateKeys() {
		this.keys = [];
		const values = getStorage('Diaphantium.clickValues') || [];
		values.forEach(item => {
			if (item.value === 'on') {
				this.keys.push(item.key);
			}
		});
	}

	simulateKey(key) {
		const down = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key,
			code: `Digit${key}`,
			keyCode: key.charCodeAt(0),
			which: key.charCodeAt(0)
		});

		const up = new KeyboardEvent('keyup', {
			bubbles: true,
			cancelable: true,
			key,
			code: `Digit${key}`,
			keyCode: key.charCodeAt(0),
			which: key.charCodeAt(0)
		});

		document.dispatchEvent(down);
		document.dispatchEvent(up);
	}

	simulateArrowKey(key) {
		const keyMap = {
			'ArrowLeft': 37,
			'ArrowRight': 39
		};

		const down = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key,
			code: key,
			keyCode: keyMap[key],
			which: keyMap[key]
		});

		const up = new KeyboardEvent('keyup', {
			bubbles: true,
			cancelable: true,
			key,
			code: key,
			keyCode: keyMap[key],
			which: keyMap[key]
		});

		document.dispatchEvent(down);
		document.dispatchEvent(up);
	}

	simulateArrowKeyDown(key) {
		const keyMap = {
			'ArrowLeft': 37,
			'ArrowRight': 39
		};

		const down = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key,
			code: key,
			keyCode: keyMap[key],
			which: keyMap[key]
		});

		document.dispatchEvent(down);
	}

	simulateArrowKeyUp(key) {
		const keyMap = {
			'ArrowLeft': 37,
			'ArrowRight': 39
		};

		const up = new KeyboardEvent('keyup', {
			bubbles: true,
			cancelable: true,
			key,
			code: key,
			keyCode: keyMap[key],
			which: keyMap[key]
		});

		document.dispatchEvent(up);
	}

	simulateDeleteKey() {
		const down = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'Delete',
			code: 'Delete',
			keyCode: 46,
			which: 46
		});

		const up = new KeyboardEvent('keyup', {
			bubbles: true,
			cancelable: true,
			key: 'Delete',
			code: 'Delete',
			keyCode: 46,
			which: 46
		});

		document.dispatchEvent(down);
		document.dispatchEvent(up);
	}

	loadState() {
		if (getStorage('Diaphantium.clickSuppliesState') === true) {
			this.startSupplies();
		}
		if (getStorage('Diaphantium.antiAfkState') === true) {
			this.startAntiAfk();
		}
		if (getStorage('Diaphantium.autoDeleteState') === true) {
			this.startAutoDelete();
		}
	}
}
