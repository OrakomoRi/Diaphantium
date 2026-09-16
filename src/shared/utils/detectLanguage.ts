const CONFIG_KEY = 'Diaphantium.config';

export function chosenLanguage(): string | null {
	try {
		const language: unknown = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null')?.language;
		return typeof language === 'string' && language !== 'auto' ? language : null;
	} catch {
		return null;
	}
}

export function gameLanguage(): string {
	const urlLanguage = new URLSearchParams(document.location.search).get('locale');
	if (urlLanguage) return urlLanguage.toLowerCase();

	const storedLanguage = localStorage.getItem('language_store_key');
	if (storedLanguage) return storedLanguage.toLowerCase();

	return (navigator.language.split('-')[0] ?? '').toLowerCase();
}

export function detectLanguage(): string {
	return chosenLanguage() ?? gameLanguage();
}
