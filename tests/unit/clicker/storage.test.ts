import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CONFIG_KEY = 'Diaphantium.config';

async function freshStorage() {
	vi.resetModules();
	return import('@/clicker/storage/storage');
}

function stored(): unknown {
	const raw = localStorage.getItem(CONFIG_KEY);
	return raw === null ? null : JSON.parse(raw);
}

describe('clicker storage', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns the defaults when nothing is stored', async () => {
		const { getStorage } = await freshStorage();

		expect(getStorage('coordinates')).toEqual({ top: 100, left: 100 });
		expect(getStorage('clickValues')).toEqual([]);
		expect(getStorage('clickSuppliesState')).toBe(false);
		expect(getStorage('mineDelay')).toBe(100);
		expect(getStorage('antiAfkState')).toBe(false);
		expect(getStorage('autoDeleteState')).toBe(false);
		expect(getStorage('hotkeys')).toEqual([]);
		expect(getStorage('showSignature')).toBe(true);
	});

	it('merges the stored config over the defaults', async () => {
		localStorage.setItem(CONFIG_KEY, JSON.stringify({ mineDelay: 250, showSignature: false }));
		const { getStorage } = await freshStorage();

		expect(getStorage('mineDelay')).toBe(250);
		expect(getStorage('showSignature')).toBe(false);
		expect(getStorage('coordinates')).toEqual({ top: 100, left: 100 });
	});

	it('falls back to the defaults when the stored config is not valid JSON', async () => {
		localStorage.setItem(CONFIG_KEY, '{broken');
		const { getStorage } = await freshStorage();

		expect(getStorage('mineDelay')).toBe(100);
	});

	it('reads localStorage once and serves later reads from memory', async () => {
		const { getStorage } = await freshStorage();
		const getItem = vi.spyOn(Storage.prototype, 'getItem');

		getStorage('mineDelay');
		localStorage.setItem(CONFIG_KEY, JSON.stringify({ mineDelay: 999 }));

		expect(getStorage('mineDelay')).toBe(100);
		expect(getItem).not.toHaveBeenCalled();
	});

	it('writes a pending change at once when the page is being unloaded', async () => {
		const { setStorage } = await freshStorage();

		setStorage('theme', 'liquid');
		window.dispatchEvent(new Event('pagehide'));

		expect(stored()).toMatchObject({ theme: 'liquid' });
		localStorage.clear();
		vi.advanceTimersByTime(300);
		expect(stored()).toBeNull();
	});

	it('writes the whole config 300 ms after the last change', async () => {
		const { setStorage } = await freshStorage();

		setStorage('mineDelay', 150);
		vi.advanceTimersByTime(200);
		setStorage('antiAfkState', true);
		vi.advanceTimersByTime(299);
		expect(stored()).toBeNull();

		vi.advanceTimersByTime(1);
		expect(stored()).toEqual({
			coordinates: { top: 100, left: 100 },
			clickValues: [],
			clickSuppliesState: false,
			clickMinesState: false,
			mineDelay: 150,
			antiAfkState: true,
			autoDeleteState: false,
			hotkeys: [],
			showSignature: true,
			theme: 'classic',
			language: 'auto',
		});
	});

	it('keeps the in-memory config when localStorage refuses to write', async () => {
		const { getStorage, setStorage } = await freshStorage();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('Quota exceeded', 'QuotaExceededError');
		});

		setStorage('mineDelay', 400);

		expect(() => vi.advanceTimersByTime(300)).not.toThrow();
		expect(getStorage('mineDelay')).toBe(400);
	});
});
