import { BUILD_VERSION, CLICKER_STUB, USERSCRIPT_VERSION, expect, legacyBundle, test } from './support/fixtures';

const CLICKER_URL = `https://diaphantium-builds.vercel.app/versions/5.0.2/${USERSCRIPT_VERSION}/diaphantium.min.js?t=*`;
const STABLE_URL = `https://diaphantium-builds.vercel.app/stable.json?v=${USERSCRIPT_VERSION}`;
const TOAST_URL = `https://diaphantium-builds.vercel.app/versions/${BUILD_VERSION.match(/^\d+\.\d+\.\d+/)?.[0]}/${BUILD_VERSION}/update-toast.min.js`;

const NEWER_STABLE = {
	versions: [
		{ version: '5.1.0', date: '2026-09-01', hash: 'b0c1d2e3' },
		{ version: '5.0.2', date: '2026-05-02', hash: 'a0b1c2d3' },
		{ version: '4.0.2', date: '2024-10-19', hash: '90a1b2c3' },
	],
};

const SAME_STABLE = {
	versions: [{ version: '5.0.2', date: '2026-05-02', hash: 'a0b1c2d3' }],
};

test.describe('clicker delivery', () => {
	test('downloads, caches and injects the clicker on the first run', async ({ loader }) => {
		await loader.start({ stable: SAME_STABLE });

		await expect.poll(() => loader.clickerRuns()).toBe(1);
		expect(await loader.injectedScripts()).toEqual([{ resource: 'DiaphantiumJS', content: CLICKER_STUB }]);
		await expect.poll(() => loader.events()).toEqual([
			{ type: 'store:get', key: 'DiaphantiumVersion' },
			{ type: 'fetch', url: CLICKER_URL, format: 'text' },
			{ type: 'store:set', key: 'DiaphantiumMainJS', value: CLICKER_STUB },
			{ type: 'store:set', key: 'DiaphantiumVersion', value: USERSCRIPT_VERSION },
			{ type: 'fetch', url: STABLE_URL, format: 'json' },
		]);
	});

	test('injects the cached clicker when the userscript version has not changed', async ({ loader }) => {
		await loader.start({ stable: SAME_STABLE, store: { DiaphantiumVersion: USERSCRIPT_VERSION, DiaphantiumMainJS: CLICKER_STUB } });

		await expect.poll(() => loader.clickerRuns()).toBe(1);
		await expect.poll(() => loader.events()).toEqual([
			{ type: 'store:get', key: 'DiaphantiumVersion' },
			{ type: 'store:get', key: 'DiaphantiumMainJS' },
			{ type: 'fetch', url: STABLE_URL, format: 'json' },
		]);
	});

	test('downloads again when the cached clicker belongs to another version', async ({ loader }) => {
		await loader.start({ stable: SAME_STABLE, store: { DiaphantiumVersion: '5.0.1', DiaphantiumMainJS: 'window.__staleClicker = true;' } });

		await expect.poll(() => loader.clickerRuns()).toBe(1);
		expect(await loader.page.evaluate(() => (window as unknown as { __staleClicker?: boolean }).__staleClicker ?? false)).toBe(false);
		expect((await loader.events()).filter(event => event.type === 'store:set')).toEqual([
			{ type: 'store:set', key: 'DiaphantiumMainJS', value: CLICKER_STUB },
			{ type: 'store:set', key: 'DiaphantiumVersion', value: USERSCRIPT_VERSION },
		]);
	});

	test('injects nothing when the download fails', async ({ loader }) => {
		await loader.start({ stable: SAME_STABLE, clickerFails: true });

		await expect.poll(async () => (await loader.events()).some(event => event.url === STABLE_URL)).toBe(true);
		expect(await loader.injectedScripts()).toEqual([]);
		expect((await loader.events()).filter(event => event.type === 'store:set')).toEqual([]);
		await expect(loader.toast).toHaveCount(0);
	});

	test('does nothing without a userscript version', async ({ loader, page }) => {
		await loader.start({ version: null, stable: NEWER_STABLE });
		await page.waitForTimeout(300);

		expect(await loader.events()).toEqual([]);
		expect(await loader.injectedScripts()).toEqual([]);
	});

	test('loads the clicker from a development source without cache or update check', async ({ loader }) => {
		test.skip(legacyBundle, 'development sources were added in the TypeScript loader');
		await loader.start({ source: 'http://localhost:4173/', stable: NEWER_STABLE });

		await expect.poll(() => loader.clickerRuns()).toBe(1);
		await expect.poll(() => loader.events()).toEqual([
			{ type: 'fetch', url: 'http://localhost:4173/diaphantium.min.js?t=*', format: 'text' },
		]);
		await expect.poll(() => loader.logs()).toContain('%cDiaphantium log:\n%cClicker injected successfully.');
	});
});

test.describe('update toast', () => {
	test('offers the newest stable version and remembers Skip', async ({ loader, page }) => {
		await loader.start({ stable: NEWER_STABLE });

		await expect(loader.toastTitle).toHaveText('Diaphantium: New version available!');
		await expect(loader.toastText).toHaveText('Version 5.1.0 is available (2026-09-01). Update now?');
		await expect(loader.toastButtons).toHaveText(['Skip', 'Later', 'Update']);

		await page.getByRole('button', { name: 'Skip' }).click();

		await expect(loader.toast).toHaveCount(0);
		expect((await loader.events()).filter(event => event.key === 'skippedVersion')).toEqual([
			{ type: 'store:get', key: 'skippedVersion' },
			{ type: 'store:set', key: 'skippedVersion', value: '5.1.0' },
		]);
	});

	test('downloads the toast of the loader\'s own build, whatever version the userscript declares', async ({ loader }) => {
		test.skip(legacyBundle, 'the toast was part of the loader before it became a separate bundle');
		await loader.start({ version: '5.0.1', stable: NEWER_STABLE });

		await expect(loader.toastText).toHaveText('Version 5.1.0 is available (2026-09-01). Update now?');
		expect((await loader.events()).filter(event => event.type === 'fetch')).toEqual([
			{ type: 'fetch', url: 'https://diaphantium-builds.vercel.app/versions/5.0.1/5.0.1/diaphantium.min.js?t=*', format: 'text' },
			{ type: 'fetch', url: 'https://diaphantium-builds.vercel.app/stable.json?v=5.0.1', format: 'json' },
			{ type: 'fetch', url: TOAST_URL, format: 'text' },
		]);
		expect(await loader.injectedScripts()).toEqual([{ resource: 'DiaphantiumJS', content: CLICKER_STUB }]);
	});

	test('shows and remembers nothing when the toast cannot be downloaded', async ({ loader, page }) => {
		test.skip(legacyBundle, 'the toast was part of the loader before it became a separate bundle');
		await loader.start({ stable: NEWER_STABLE, toastFails: true });

		await expect.poll(async () => (await loader.events()).some(event => event.url === TOAST_URL)).toBe(true);
		await page.waitForTimeout(500);
		await expect(loader.toast).toHaveCount(0);
		expect(await loader.clickerRuns()).toBe(1);
		expect((await loader.events()).filter(event => event.type === 'store:set' && event.key === 'skippedVersion')).toEqual([]);
	});

	test('opens the update for the stable commit on Update', async ({ loader, page }) => {
		await loader.start({ stable: NEWER_STABLE });

		await page.getByRole('button', { name: 'Update' }).click();

		await expect(loader.toast).toHaveCount(0);
		expect((await loader.events()).at(-1)).toEqual({ type: 'update', hash: 'b0c1d2e3' });
	});

	test('closes on Later without remembering anything', async ({ loader, page }) => {
		await loader.start({ stable: NEWER_STABLE });

		await page.getByRole('button', { name: 'Later' }).click();

		await expect(loader.toast).toHaveCount(0);
		expect((await loader.events()).filter(event => event.type === 'store:set' && event.key === 'skippedVersion')).toEqual([]);
	});

	test('closes by itself after five seconds', async ({ loader }) => {
		await loader.start({ stable: NEWER_STABLE });
		await expect(loader.toast).toBeVisible();

		await expect(loader.toast).toHaveCount(0, { timeout: 8000 });
		expect((await loader.events()).filter(event => event.type === 'store:set' && event.key === 'skippedVersion')).toEqual([]);
	});

	test('stays hidden for a skipped version', async ({ loader, page }) => {
		await loader.start({ stable: NEWER_STABLE, store: { skippedVersion: '5.1.0' } });

		await expect.poll(async () => (await loader.events()).some(event => event.key === 'skippedVersion')).toBe(true);
		await page.waitForTimeout(500);
		await expect(loader.toast).toHaveCount(0);
		expect((await loader.events()).some(event => event.url === TOAST_URL)).toBe(false);
	});

	test('stays hidden when the userscript is the latest stable or newer', async ({ loader, page }) => {
		await loader.start({ stable: { versions: [{ version: '5.0.1', date: '2025-10-22', hash: 'c0d1e2f3' }] } });

		await expect.poll(async () => (await loader.events()).some(event => event.url === STABLE_URL)).toBe(true);
		await page.waitForTimeout(500);
		await expect(loader.toast).toHaveCount(0);
		expect((await loader.events()).some(event => event.url === TOAST_URL)).toBe(false);
	});

	test('speaks the language given by the locale parameter', async ({ loader }) => {
		await loader.start({ stable: NEWER_STABLE }, '?locale=ru');

		await expect(loader.toastTitle).toHaveText('Diaphantium: Доступна новая версия!');
		await expect(loader.toastText).toHaveText('Версия 5.1.0 доступна (2026-09-01). Обновить сейчас?');
		await expect(loader.toastButtons).toHaveText(['Пропустить', 'Позже', 'Обновить']);
	});

	test('speaks the language chosen in the panel over the game language', async ({ loader, page }) => {
		test.skip(legacyBundle, 'the panel language setting is new');
		await page.addInitScript(() => localStorage.setItem('Diaphantium.config', JSON.stringify({ language: 'uk' })));
		await loader.start({ stable: NEWER_STABLE }, '?locale=ru');

		await expect(loader.toastTitle).toHaveText('Diaphantium: Доступна нова версія!');
		await expect(loader.toastButtons).toHaveText(['Пропустити', 'Пізніше', 'Оновити']);
	});
});

test.describe('logging', () => {
	test('stays silent until diaphantium:log is dispatched', async ({ loader, page }) => {
		await loader.start({ stable: SAME_STABLE });
		await expect.poll(() => loader.clickerRuns()).toBe(1);
		await page.waitForTimeout(200);

		expect((await loader.logs()).filter(line => line.includes('Diaphantium log:'))).toEqual([]);
	});

	test('describes the load and the version check once enabled', async ({ loader, page }) => {
		await loader.start({ stable: SAME_STABLE, slowStore: true });
		await page.evaluate(() => document.dispatchEvent(new Event('diaphantium:log')));

		await expect.poll(async () => (await loader.logs()).map(line => line.replace(/t=\d+/, 't=*'))).toEqual([
			`%cDiaphantium log:\n%cFetching clicker from CDN: ${CLICKER_URL}`,
			'%cDiaphantium log:\n%cClicker cached.',
			'%cDiaphantium log:\n%cClicker injected successfully.',
			'%cDiaphantium log:\n%cYou are using some version that is based on the latest stable.',
			`%cDiaphantium log:\n%cYour × Stable:\n${USERSCRIPT_VERSION} × 5.0.2`,
		]);
	});
});
