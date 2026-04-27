class I18nManager {
	constructor(i18nInstance, { autoWatch = true, translateOnInit = true } = {}) {
		if (!i18nInstance) {
			throw new Error('I18n instance is required');
		}

		this.i18n = i18nInstance;
		this._observer = null;
		this._isWatching = false;

		if (translateOnInit) this.updateDOM();
		if (autoWatch) this.startWatching();
	}

	updateDOM() {
		this._updateDocumentLanguage();
		this._updateByTextContent();
		this._updateByKeyAttribute();
		this._updateAttributes();
	}

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

		this._observer.observe(document.body, { childList: true, subtree: true });
		this._isWatching = true;
	}

	stopWatching() {
		if (this._observer) {
			this._observer.disconnect();
			this._observer = null;
		}
		this._isWatching = false;
	}

	async setLocale(locale, options = {}) {
		const oldLocale = this.i18n.locale;
		await this.i18n.setLocale(locale, options);
		this.updateDOM();

		if (oldLocale !== this.i18n.locale) {
			document.dispatchEvent(new CustomEvent('languageChanged', {
				detail: { oldLocale, newLocale: this.i18n.locale }
			}));
		}

		return this;
	}

	add(locale, messages, { updateDOM = true, ...i18nOptions } = {}) {
		this.i18n.add(locale, messages, i18nOptions);
		if (updateDOM) this.updateDOM();
		return this;
	}

	get locale() {
		return this.i18n.locale;
	}

	getI18n() {
		return this.i18n;
	}

	destroy() {
		this.stopWatching();
	}

	_updateDocumentLanguage() {
		document.documentElement.lang = this.i18n.locale;
		document.documentElement.dir = this._isRTL() ? 'rtl' : 'ltr';
	}

	_isRTL() {
		const rtlLangs = ['ar', 'he', 'fa', 'ur'];
		return rtlLangs.includes(this.i18n.locale.split('-')[0]);
	}

	_handleNewElement(node) {
		const elementsToTranslate = [];

		if (node.hasAttribute && this._needsTranslation(node)) {
			elementsToTranslate.push(node);
		}

		elementsToTranslate.push(...node.querySelectorAll(this._getTranslationSelectors()));
		elementsToTranslate.forEach(el => this._translateElement(el));
	}

	_needsTranslation(el) {
		return el.hasAttribute('data-i18n') ||
			el.hasAttribute('data-i18n-key') ||
			el.hasAttribute('data-i18n-attr');
	}

	_getTranslationSelectors() {
		return '[data-i18n], [data-i18n-key], [data-i18n-attr]';
	}

	_updateByTextContent() {
		document.querySelectorAll('[data-i18n]').forEach(el => {
			const key = el.textContent.trim();
			if (key && this.i18n.exists(key)) {
				el.textContent = this.i18n.t(key, this._parseElementParams(el));
			}
		});
	}

	_updateByKeyAttribute() {
		document.querySelectorAll('[data-i18n-key]').forEach(el => {
			const key = el.getAttribute('data-i18n-key');
			if (key) {
				const translation = this.i18n.t(key, this._parseElementParams(el));
				if (translation.includes('<')) {
					el.innerHTML = translation;
				} else {
					el.textContent = translation;
				}
			}
		});
	}

	_updateAttributes() {
		document.querySelectorAll('[data-i18n-attr]').forEach(el => {
			const attrConfig = el.getAttribute('data-i18n-attr');
			if (!attrConfig) return;

			attrConfig.split(';').forEach(config => {
				const [attr, key] = config.split(':').map(s => s.trim());
				if (attr && key) {
					el.setAttribute(attr, this.i18n.t(key, this._parseElementParams(el)));
				}
			});
		});
	}

	_translateElement(el) {
		const params = this._parseElementParams(el);

		if (el.hasAttribute('data-i18n')) {
			const key = el.textContent.trim();
			if (key && this.i18n.exists(key)) {
				el.textContent = this.i18n.t(key, params);
			}
		} else if (el.hasAttribute('data-i18n-key')) {
			const key = el.getAttribute('data-i18n-key');
			if (key) {
				const translation = this.i18n.t(key, params);
				if (translation.includes('<')) {
					el.innerHTML = translation;
				} else {
					el.textContent = translation;
				}
			}
		}

		if (el.hasAttribute('data-i18n-attr')) {
			const attrConfig = el.getAttribute('data-i18n-attr');
			if (attrConfig) {
				attrConfig.split(';').forEach(config => {
					const [attr, key] = config.split(':').map(s => s.trim());
					if (attr && key) {
						el.setAttribute(attr, this.i18n.t(key, params));
					}
				});
			}
		}
	}

	_parseElementParams(el) {
		const params = {};

		const paramsAttr = el.getAttribute('data-i18n-params');
		if (paramsAttr) {
			try {
				Object.assign(params, JSON.parse(paramsAttr));
			} catch (err) {
				console.warn('Invalid i18n params JSON:', paramsAttr, err);
			}
		}

		Array.from(el.attributes).forEach(attr => {
			if (attr.name.startsWith('data-i18n-param-')) {
				const paramName = attr.name.replace('data-i18n-param-', '');
				let paramValue = attr.value;

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
