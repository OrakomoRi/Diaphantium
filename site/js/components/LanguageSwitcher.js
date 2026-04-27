import { LANG_STORAGE_KEY } from '../config.js';

export class LanguageSwitcher {
	constructor(i18nManager, languages, onChange) {
		this.i18nManager = i18nManager;
		this.languages = languages;
		this.onChange = onChange;
	}

	setup() {
		const containers = document.querySelectorAll('.language-switcher');
		if (!containers.length || typeof BreeziumSelect === 'undefined' || !this.languages.length) return;

		const currentLang = this.i18nManager.locale;

		containers.forEach(container => {
			const select = new BreeziumSelect(
				this.languages,
				async (value) => {
					await this.i18nManager.setLocale(value);
					localStorage.setItem(LANG_STORAGE_KEY, value);
					this.onChange?.(value);
				},
				currentLang
			);
			select.render(container);
		});
	}
}
