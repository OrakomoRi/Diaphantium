import { describe, expect, it } from 'vitest';
import { parseDelay, sanitizeDigits } from '@/clicker/ui/model/mineDelay';

describe('sanitizeDigits', () => {
	it('drops every character that is not a digit', () => {
		expect(sanitizeDigits('1a2-b 3').value).toBe('123');
		expect(sanitizeDigits('abc').value).toBe('');
	});

	it('keeps the caret after the same digit it followed', () => {
		expect(sanitizeDigits('12x3', 3)).toEqual({ value: '123', caret: 2 });
		expect(sanitizeDigits('a1b2', 4)).toEqual({ value: '12', caret: 2 });
		expect(sanitizeDigits('12', 1)).toEqual({ value: '12', caret: 1 });
	});
});

describe('parseDelay', () => {
	it('accepts whole numbers from 0 to 60000', () => {
		expect(parseDelay('0')).toBe(0);
		expect(parseDelay('007')).toBe(7);
		expect(parseDelay('60000')).toBe(60000);
	});

	it('rejects empty, non-digit and out-of-range input', () => {
		expect(parseDelay('')).toBeNull();
		expect(parseDelay('12a')).toBeNull();
		expect(parseDelay('60001')).toBeNull();
		expect(parseDelay('99999999999999999999')).toBeNull();
	});
});
