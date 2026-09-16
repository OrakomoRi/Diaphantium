import { computed } from 'vue';
import { useI18n } from 'petite-vue-i18n';
import { AUTHOR, LICENSE, NAME, REPOSITORY_URL } from '../../config/config';

export function formatReleaseDate(date: string, locale: string): string {
	const parsed = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return date;
	return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(parsed);
}

export function useAbout() {
	const { locale } = useI18n({ useScope: 'global' });

	return {
		name: NAME,
		version: __DIAPHANTIUM_BUILD__,
		released: computed(() => formatReleaseDate(__DIAPHANTIUM_RELEASE_DATE__, locale.value)),
		author: AUTHOR,
		license: LICENSE,
		repository: REPOSITORY_URL,
	};
}
