import { describe, expect, it } from 'vitest';
import en from '@/clicker/locales/lang/en.json';
import ru from '@/clicker/locales/lang/ru.json';
import uk from '@/clicker/locales/lang/uk.json';

function keys(tree: object, prefix = ''): string[] {
	return Object.entries(tree).flatMap(([key, value]) => (typeof value === 'object' && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`])).sort();
}

describe('panel translations', () => {
	for (const [language, messages] of Object.entries({ ru, uk })) {
		it(`${language} has every English key and no other`, () => {
			expect(keys(messages)).toEqual(keys(en));
		});
	}

	it('keeps the placeholders of every text', () => {
		const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
		const flat = (tree: object, prefix = ''): Array<[string, string]> => Object.entries(tree).flatMap(([key, value]) => (typeof value === 'object' && value !== null ? flat(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)] as [string, string]]));
		const english = new Map(flat(en));
		for (const messages of [ru, uk]) {
			for (const [key, text] of flat(messages)) expect(placeholders(text), key).toEqual(placeholders(english.get(key) ?? ''));
		}
	});
});
