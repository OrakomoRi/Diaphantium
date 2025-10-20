import { BackgroundAnimation } from './components/BackgroundAnimation.js';
import { SmoothScroll } from './components/SmoothScroll.js';
import { HeaderController } from './components/HeaderController.js';
import { TerminalSimulator } from './components/TerminalSimulator.js';
import I18n from '../libs/i18n/i18n.js';
import I18nManager from './components/I18nManager.js';

class DiaphantiumWebsite {
	constructor() {
		this.components = {};
		this.languageSelect = null;
		this.availableLanguages = [];
		this.init();
	}

	async init() {
		await this.waitForDOM();
		await this.loadTranslationsConfig();
		await this.initI18n();
		this.loadScriptVersion();
		this.loadHotkey();
		await this.setupDownloadButtons();
		this.setupDevButton();
		this.initializeComponents();
		this.setupAnimations();
		console.log('✓ Diaphantium website loaded');
	}

	async loadTranslationsConfig() {
		try {
			const response = await fetch('./assets/config/translations.json');
			if (!response.ok) throw new Error('Failed to load translations config');
			const config = await response.json();
			this.availableLanguages = config.languages || [];
			console.log('✓ Translations config loaded:', this.availableLanguages.length, 'languages');
		} catch (error) {
			console.warn('Failed to load translations config:', error);
			// Fallback to default languages
			this.availableLanguages = [
				{ name: 'English', value: 'en' },
				{ name: 'Русский', value: 'ru' }
			];
		}
	}

	waitForDOM() {
		return new Promise(resolve => {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', resolve);
			} else {
				resolve();
			}
		});
	}

	async initI18n() {
		try {
			const i18n = new I18n({
				locale: localStorage.getItem('diaphantium_lang') || 'en',
				fallbacks: ['en'],
				loader: async (locale) => {
					const response = await fetch(`./assets/lang/${locale}.json`);
					if (!response.ok) throw new Error(`Failed to load ${locale}`);
					return response.json();
				}
			});

			await i18n.load();
			this.components.i18n = new I18nManager(i18n);
			this.setupLanguageSwitcher();
		} catch (error) {
			console.warn('I18n initialization failed:', error);
		}
	}

	setupLanguageSwitcher() {
		const containers = document.querySelectorAll('.language-switcher');
		if (!containers || containers.length === 0) {
			console.warn('Language switcher container not found');
			return;
		}

		if (typeof BreeziumSelect === 'undefined') {
			console.error('BreeziumSelect is not loaded');
			return;
		}

		if (this.availableLanguages.length === 0) {
			console.error('No languages available');
			return;
		}

		const currentLang = this.components.i18n.locale;

		// Initialize language switcher for both desktop and mobile
		containers.forEach((container, index) => {
			const languageSelect = new BreeziumSelect(
				this.availableLanguages,
				async (value) => {
					console.log('Language changed to:', value);
					await this.components.i18n.setLocale(value);
					localStorage.setItem('diaphantium_lang', value);
					this.loadHotkey();

					// Update terminal messages when language changes
					if (this.components.terminal) {
						this.components.terminal.updateLanguage();
					}
				},
				currentLang
			);

			languageSelect.render(container);

			if (index === 0) {
				this.languageSelect = languageSelect;
			}
		});

		console.log('Language switchers initialized with locale:', currentLang);
	}

	async loadScriptVersion() {
		try {
			const response = await fetch('./release/diaphantium.user.js');
			const text = await response.text();
			// Match semantic versioning: major.minor.patch[-prerelease][+build]
			const match = text.match(/@version\s+([\d.]+(?:-[\w.]+)?(?:\+[\w.]+)?)/);
			if (match) {
				const version = match[1];

				// Update hero badge version
				const heroVersion = document.querySelector('.hero-version');
				if (heroVersion) {
					heroVersion.textContent = version;
				}
			}
		} catch (e) {
			console.warn('Failed to load script version:', e);
		}
	}

	async getLatestStableVersion() {
		const timestamp = new Date().getTime();
		const fallbackUrl = `https://orakomori.github.io/Diaphantium/release/diaphantium.user.js?t=${timestamp}`;

		try {
			const response = await fetch(`https://raw.githubusercontent.com/OrakomoRi/Diaphantium/builds/stable.json?t=${timestamp}`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();

			if (data?.versions?.length > 0) {
				const latestVersion = data.versions[data.versions.length - 1];
				return latestVersion.link || fallbackUrl;
			}
		} catch (error) {
			console.warn('Error fetching latest stable version:', error);
		}

		return fallbackUrl;
	}

	generateLatestDevUrl() {
		const timestamp = new Date().getTime();
		return `https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js?t=${timestamp}`;
	}

	async setupDownloadButtons() {
		const downloadButtons = document.querySelectorAll('[data-download]');
		
		if (downloadButtons.length === 0) {
			console.warn('No download buttons found');
			return;
		}

		try {
			const stableLink = await this.getLatestStableVersion();
			
			downloadButtons.forEach(button => {
				button.href = stableLink;
			});

			console.log('✓ Download buttons configured with stable version');
		} catch (error) {
			console.error('Error setting up download buttons:', error);
		}
	}

	setupDevButton() {
		const devButton = document.querySelector('[data-dev-download]');
		if (!devButton) return;

		devButton.removeAttribute('href');
		devButton.addEventListener('click', (e) => {
			e.preventDefault();
			window.open(this.generateLatestDevUrl(), '_blank');
		});

		console.log('✓ Dev button configured');
	}

	loadHotkey() {
		try {
			const hotkeyData = localStorage.getItem('Diaphantium.hotkeys');
			let hotkey = 'Slash';

			if (hotkeyData) {
				const hotkeys = JSON.parse(hotkeyData);
				hotkey = hotkeys[0]?.value || 'Slash';
			}

			const hotkeyDisplay = hotkey === 'Slash' ? '/' : hotkey;

			// Update Quick Start hotkey display
			const hotkeyElement = document.querySelector('.hotkey-key');
			if (hotkeyElement) {
				hotkeyElement.textContent = hotkeyDisplay;
			}

			// Update console help hotkey
			const consoleHotkeyDisplay = document.querySelector('.hotkey-display-inline');
			if (consoleHotkeyDisplay) {
				consoleHotkeyDisplay.textContent = hotkeyDisplay;
			}
		} catch (e) {
			console.warn('Failed to load hotkey:', e);
		}
	}

	initializeComponents() {
		this.components.backgroundAnimation = new BackgroundAnimation();
		this.components.smoothScroll = new SmoothScroll();
		this.components.header = new HeaderController();

		const terminalElement = document.querySelector('.terminal');
		if (terminalElement && this.components.i18n) {
			this.components.terminal = new TerminalSimulator(terminalElement, this.components.i18n.i18n);
		}
	}

	setupAnimations() {
		// Animations disabled for better mobile experience
		// All elements are now visible by default
	}
}

new DiaphantiumWebsite();
