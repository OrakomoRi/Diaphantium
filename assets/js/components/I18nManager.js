/**
 * I18nManager - DOM Translation Manager
 * Handles automatic DOM translation with data attributes
 */
class I18nManager {
	/**
	 * Initialize I18nManager
	 * @param {I18n} i18nInstance - Instance of I18n class
	 * @param {Object} options - Configuration options
	 * @param {boolean} [options.autoWatch=true] - Auto-watch DOM changes
	 * @param {boolean} [options.translateOnInit=true] - Translate existing elements on init
	 */
	constructor(i18nInstance, { autoWatch = true, translateOnInit = true } = {}) {
		if (!i18nInstance) {
			throw new Error('I18n instance is required');
		}

		this.i18n = i18nInstance;
		this._observer = null;
		this._isWatching = false;

		// Initialize
		if (translateOnInit) {
			this.updateDOM();
		}

		if (autoWatch) {
			this.startWatching();
		}
	}

	/**
	 * Update all translatable elements in DOM
	 * Main method to trigger translation of existing elements
	 */
	updateDOM() {
		this._updateDocumentLanguage();
		this._updateByTextContent();
		this._updateByKeyAttribute();
		this._updateAttributes();
	}

	/**
	 * Start watching DOM for new elements
	 * Uses MutationObserver to detect dynamically added content
	 */
	startWatching() {
		if (typeof MutationObserver === 'undefined' || this._isWatching) return;

		this._observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				mutation.addedNodes.forEach(node => {
					if (node.nodeType === Node.ELEMENT_NODE) {
						this._handleNewElement(node);
					}
				});
			});
		});

		this._observer.observe(document.body, {
			childList: true,
			subtree: true
		});

		this._isWatching = true;
	}

	/**
	 * Stop watching DOM changes
	 */
	stopWatching() {
		if (this._observer) {
			this._observer.disconnect();
			this._observer = null;
		}
		this._isWatching = false;
	}

	/**
	 * Change locale and update DOM
	 * @param {string} locale - New locale
	 * @param {Object} options - Locale change options
	 * @returns {Promise<I18nManager>} - Promise resolving to this instance
	 */
	async setLocale(locale, options = {}) {
		const oldLocale = this.i18n.locale;
		await this.i18n.setLocale(locale, options);
		this.updateDOM();
		
		// Dispatch custom event for components to listen to language changes
		if (oldLocale !== this.i18n.locale) {
			const event = new CustomEvent('languageChanged', {
				detail: {
					oldLocale,
					newLocale: this.i18n.locale
				}
			});
			document.dispatchEvent(event);
		}
		
		return this;
	}

	/**
	 * Add translations and optionally update DOM
	 * @param {string} locale - Target locale
	 * @param {Object} messages - Translation messages
	 * @param {Object} options - Options
	 * @param {boolean} [options.updateDOM=true] - Update DOM after adding translations
	 * @returns {I18nManager} - Chainable instance
	 */
	add(locale, messages, { updateDOM = true, ...i18nOptions } = {}) {
		this.i18n.add(locale, messages, i18nOptions);
		if (updateDOM) {
			this.updateDOM();
		}
		return this;
	}

	/**
	 * Get current locale
	 * @returns {string} - Current locale
	 */
	get locale() {
		return this.i18n.locale;
	}

	/**
	 * Get I18n instance
	 * @returns {I18n} - I18n instance
	 */
	getI18n() {
		return this.i18n;
	}

	/**
	 * Cleanup and destroy manager
	 */
	destroy() {
		this.stopWatching();
		// Don't destroy the i18n instance as it might be used elsewhere
	}

	// ===== PRIVATE METHODS =====

	/**
	 * Update document <html> lang and dir attributes
	 * @private
	 */
	_updateDocumentLanguage() {
		document.documentElement.lang = this.i18n.locale;
		document.documentElement.dir = this._isRTL() ? 'rtl' : 'ltr';
	}
	
	/**
	 * Check if current locale is RTL
	 * @returns {boolean} - True if RTL language
	 * @private
	 */
	_isRTL() {
		const rtlLangs = ['ar', 'he', 'fa', 'ur'];
		return rtlLangs.includes(this.i18n.locale.split('-')[0]);
	}

	/**
	 * Handle newly added element to DOM
	 * @param {Element} node - New DOM element
	 * @private
	 */
	_handleNewElement(node) {
		// Collect elements that need translation
		const elementsToTranslate = [];

		// Check if the node itself needs translation
		if (node.hasAttribute && this._needsTranslation(node)) {
			elementsToTranslate.push(node);
		}

		// Find child elements that need translation
		elementsToTranslate.push(...node.querySelectorAll(this._getTranslationSelectors()));

		// Translate all found elements
		elementsToTranslate.forEach(el => this._translateElement(el));
	}

	/**
	 * Check if element needs translation
	 * @param {Element} el - Element to check
	 * @returns {boolean} - True if element needs translation
	 * @private
	 */
	_needsTranslation(el) {
		return el.hasAttribute('data-i18n') ||
			el.hasAttribute('data-i18n-key') ||
			el.hasAttribute('data-i18n-attr');
	}

	/**
	 * Get CSS selectors for translatable elements
	 * @returns {string} - CSS selector string
	 * @private
	 */
	_getTranslationSelectors() {
		return '[data-i18n], [data-i18n-key], [data-i18n-attr]';
	}

	/**
	 * Use textContent as translation key
	 * Mode 1: <div data-i18n>welcome.message</div>
	 * @private
	 */
	_updateByTextContent() {
		const elements = document.querySelectorAll('[data-i18n]');
		elements.forEach(el => {
			const key = el.textContent.trim();
			if (key && this.i18n.exists(key)) {
				const params = this._parseElementParams(el);
				el.textContent = this.i18n.t(key, params);
			}
		});
	}

	/**
	 * Use explicit key from data-i18n-key attribute
	 * Mode 2: <div data-i18n-key="welcome.message">Default text</div>
	 * Supports HTML content in translations
	 * @private
	 */
	_updateByKeyAttribute() {
		const elements = document.querySelectorAll('[data-i18n-key]');
		elements.forEach(el => {
			const key = el.getAttribute('data-i18n-key');
			if (key) {
				const params = this._parseElementParams(el);
				const translation = this.i18n.t(key, params);
				// Use innerHTML to support HTML in translations
				if (translation.includes('<')) {
					el.innerHTML = translation;
				} else {
					el.textContent = translation;
				}
			}
		});
	}

	/**
	 * Translate element attributes (title, placeholder, etc.)
	 * Mode 3: <input data-i18n-attr="placeholder:search.hint;title:search.tooltip">
	 * @private
	 */
	_updateAttributes() {
		const elements = document.querySelectorAll('[data-i18n-attr]');
		elements.forEach(el => {
			const attrConfig = el.getAttribute('data-i18n-attr');
			if (!attrConfig) return;

			const configs = attrConfig.split(';');
			configs.forEach(config => {
				const [attr, key] = config.split(':').map(s => s.trim());
				if (attr && key) {
					const params = this._parseElementParams(el);
					el.setAttribute(attr, this.i18n.t(key, params));
				}
			});
		});
	}

	/**
	 * Translate a single element (used for new DOM elements)
	 * @param {Element} el - Element to translate
	 * @private
	 */
	_translateElement(el) {
		const params = this._parseElementParams(el);

		// Handle text content translation
		if (el.hasAttribute('data-i18n')) {
			const key = el.textContent.trim();
			if (key && this.i18n.exists(key)) {
				el.textContent = this.i18n.t(key, params);
			}
		} else if (el.hasAttribute('data-i18n-key')) {
			const key = el.getAttribute('data-i18n-key');
			if (key) {
				const translation = this.i18n.t(key, params);
				// Use innerHTML to support HTML in translations
				if (translation.includes('<')) {
					el.innerHTML = translation;
				} else {
					el.textContent = translation;
				}
			}
		}

		// Handle attribute translation
		if (el.hasAttribute('data-i18n-attr')) {
			const attrConfig = el.getAttribute('data-i18n-attr');
			if (attrConfig) {
				const configs = attrConfig.split(';');
				configs.forEach(config => {
					const [attr, key] = config.split(':').map(s => s.trim());
					if (attr && key) {
						el.setAttribute(attr, this.i18n.t(key, params));
					}
				});
			}
		}
	}

	/**
	 * Parse parameters from element data attributes
	 * Supports both JSON format and individual param attributes
	 * @param {Element} el - DOM element
	 * @returns {Object} - Parameters for translation
	 * @private
	 */
	_parseElementParams(el) {
		const params = {};

		// Parse data-i18n-params='{"name":"John","count":5}' 
		const paramsAttr = el.getAttribute('data-i18n-params');
		if (paramsAttr) {
			try {
				Object.assign(params, JSON.parse(paramsAttr));
			} catch (err) {
				console.warn('Invalid i18n params JSON:', paramsAttr, err);
			}
		}

		// Parse individual data-i18n-param-name="value" attributes
		Array.from(el.attributes).forEach(attr => {
			if (attr.name.startsWith('data-i18n-param-')) {
				const paramName = attr.name.replace('data-i18n-param-', '');
				let paramValue = attr.value;

				// Try to parse as number if it looks like one
				if (/^\d+$/.test(paramValue)) {
					paramValue = parseInt(paramValue, 10);
				} else if (/^\d*\.\d+$/.test(paramValue)) {
					paramValue = parseFloat(paramValue);
				}

				params[paramName] = paramValue;
			}
		});

		return params;
	}
}

export default I18nManager;