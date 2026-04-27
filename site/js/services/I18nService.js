import { LANG_STORAGE_KEY, DEFAULT_LANG } from '../config.js';
import I18n from '../../libs/i18n/i18n.js';
import I18nManager from '../components/I18nManager.js';

export class I18nService {
	async loadLanguages() {
		try {
			const response = await fetch('./site/config/translations.json');
			if (!response.ok) throw new Error('Failed to load translations config');
			const config = await response.json();
			return config.languages || [];
		} catch {
			return [
				{ name: 'English', value: 'en' }
			];
		}
	}

	async initI18n() {
		const i18n = new I18n({
			locale: localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG,
			fallbacks: [DEFAULT_LANG],
			loader: async (locale) => {
				const response = await fetch(`./site/lang/${locale}.json`);
				if (!response.ok) throw new Error(`Failed to load ${locale}`);
				return response.json();
			}
		});

		await i18n.load();
		return new I18nManager(i18n);
	}
}
