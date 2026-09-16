import type en from './lang/en.json';

export type UpdateStrings = typeof en;

const modules = import.meta.glob<UpdateStrings>('./lang/*.json', { eager: true, import: 'default' });

export const UPDATE_LOCALES: Readonly<Record<string, UpdateStrings>> = Object.fromEntries(
	Object.entries(modules).map(([path, strings]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), strings]),
);

export function updateStrings(language: string): UpdateStrings {
	const strings = Object.hasOwn(UPDATE_LOCALES, language) ? UPDATE_LOCALES[language] : UPDATE_LOCALES.en;
	if (!strings) throw new Error('English update strings are missing');
	return strings;
}

export function updateText(strings: UpdateStrings, version: string, date?: string): string {
	const template = date ? strings.textWithDate : strings.text;
	return template.replace(/\{(version|date)\}/g, (_, name: string) => (name === 'version' ? version : date ?? ''));
}
