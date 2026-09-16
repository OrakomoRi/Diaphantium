import { describe, expect, it } from 'vitest';
import { UPDATE_LOCALES, updateStrings, updateText } from '@/update-toast/locales';
import { TRANSLATIONS } from '../fixtures/update-translations.js';

const SAMPLES: Array<[string, string | undefined]> = [
	['5.0.3', '2026-09-15'],
	['5.0.3', ''],
	['5.0.3', undefined],
	['10.1.0-rc.1', '$&'],
	['$1', '{version}'],
];

describe('update toast locales', () => {
	it('bundles one JSON file for every language of the original dictionary', () => {
		expect(Object.keys(UPDATE_LOCALES).sort()).toEqual(Object.keys(TRANSLATIONS).sort());
	});

	it('gives every language exactly the keys of en.json', () => {
		const keys = Object.keys(UPDATE_LOCALES.en ?? {}).sort();
		for (const [language, strings] of Object.entries(UPDATE_LOCALES)) {
			expect(Object.keys(strings).sort(), language).toEqual(keys);
			expect(Object.values(strings).every(value => typeof value === 'string'), language).toBe(true);
		}
	});

	describe.each(Object.entries(TRANSLATIONS))('%s', (language, original) => {
		it('keeps the original labels', () => {
			const strings = updateStrings(language);
			expect([strings.title, strings.skip, strings.later, strings.update]).toEqual([original.title, original.skip, original.later, original.update]);
		});

		it.each(SAMPLES)('formats version %s with date %s like the original', (version, date) => {
			expect(updateText(updateStrings(language), version, date)).toBe(original.text(version, date));
		});
	});

	it.each(['xx', '', 'constructor', '__proto__', 'toString'])('falls back to English for "%s"', language => {
		expect(updateStrings(language)).toBe(UPDATE_LOCALES.en);
	});
});
