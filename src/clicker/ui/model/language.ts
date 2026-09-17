import { computed, ref } from 'vue';
import { useI18n } from 'petite-vue-i18n';
import { setStorage } from '../../storage/storage';
import { LANGUAGE_CHOICES, LANGUAGE_CODES, clickerLocale, storedLanguageChoice } from '../../locales';
import { languages as pluginLanguages } from '../../plugins/registry';
import { useThemeContext } from './panel';

export interface LanguageOption {
	id: string;
	label: string;
	name: string;
}

export function useLanguageSetting() {
	const { t, locale } = useI18n({ useScope: 'global' });
	const { layout } = useThemeContext();
	const choice = ref<string>(storedLanguageChoice());

	const options = computed<LanguageOption[]>(() => [
		...LANGUAGE_CHOICES.map(id => ({
			id,
			label: id === 'auto' ? t('languages.auto') : LANGUAGE_CODES[id],
			name: t(`languages.${id}`),
		})),
		...pluginLanguages,
	]);

	function select(next: string): void {
		if (next === choice.value) return;
		setStorage('language', next);
		void layout.run(() => {
			choice.value = next;
			locale.value = clickerLocale(next);
		});
	}

	return { choice, options, select };
}
