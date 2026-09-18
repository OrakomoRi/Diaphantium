import { expect, legacyBundle, test } from './support/fixtures';

interface PluginHandle {
	addSettingsToggle(row: { id: string; label: string; hint?: string; getChecked: () => boolean; onChange: (checked: boolean) => void }): () => void;
	features: {
		provideAction(name: string, action: () => void): () => void;
		language(): string;
		onLanguageChange(fn: (locale: string) => void): () => void;
	};
}

interface PluginBridge {
	__DIAPHANTIUM__?: { plugins: { register(manifest: { id: string; apiVersion: number }): PluginHandle | null; onReady(callback: () => void): void } };
	__pluginChecked?: () => boolean;
	__overrideCalls?: () => number;
	__disposeOverride?: () => void;
}

test.describe('plugin API', () => {
	test.skip(legacyBundle, 'plugin API is new');

	test.beforeEach(async ({ clicker }) => {
		await clicker.load();
	});

	test('registers a settings row and a feature override, both visible in classic and liquid', async ({ clicker, page }) => {
		const registered = await page.evaluate(() => {
			const win = window as unknown as PluginBridge;
			const handle = win.__DIAPHANTIUM__?.plugins.register({ id: 'e2e-plugin', apiVersion: 1 });
			if (!handle) return false;

			let checked = false;
			win.__pluginChecked = () => checked;
			handle.addSettingsToggle({
				id: 'row',
				label: 'E2E plugin row',
				hint: 'Added by a test plugin',
				getChecked: () => checked,
				onChange: (value: boolean) => {
					checked = value;
				},
			});

			return true;
		});
		expect(registered).toBe(true);

		await page.keyboard.press('Slash');
		await clicker.themeTab('plugins').click();

		await expect(clicker.popup.locator('.option__label', { hasText: 'E2E plugin row' })).toBeVisible();
		await expect(clicker.popup.locator('.option__hint, .setting__desc', { hasText: 'Added by a test plugin' })).toBeVisible();

		await clicker.control('e2e-plugin-row').click();
		await expect.poll(() => page.evaluate(() => (window as unknown as PluginBridge).__pluginChecked?.())).toBe(true);
		await expect(clicker.control('e2e-plugin-row')).toBeChecked();

		// A second click must flip it back - this is the case a stale, non-reactive `checked` prop
		// masks: the first click can look right even when the control is stuck reporting its initial
		// value forever, because "false -> true" is what a stuck prop would also report once.
		await clicker.control('e2e-plugin-row').click();
		await expect.poll(() => page.evaluate(() => (window as unknown as PluginBridge).__pluginChecked?.())).toBe(false);
		await expect(clicker.control('e2e-plugin-row')).not.toBeChecked();

		await clicker.themeTab('settings').click();
		await clicker.themeOption('liquid').click();
		await expect.poll(() => clicker.themeLayers()).toEqual(['liquid']);
		await clicker.themeTab('plugins').click();
		await expect(clicker.popup.locator('.option__label', { hasText: 'E2E plugin row' })).toBeVisible();

		await clicker.control('e2e-plugin-row').click();
		await expect.poll(() => page.evaluate(() => (window as unknown as PluginBridge).__pluginChecked?.())).toBe(true);
		await expect(clicker.control('e2e-plugin-row')).toHaveAttribute('aria-checked', 'true');
		await clicker.control('e2e-plugin-row').click();
		await expect.poll(() => page.evaluate(() => (window as unknown as PluginBridge).__pluginChecked?.())).toBe(false);
		await expect(clicker.control('e2e-plugin-row')).toHaveAttribute('aria-checked', 'false');
	});

	test('a settings row re-translates live when the language changes, with the window open, no reload', async ({ clicker, page }) => {
		await page.evaluate(() => {
			const win = window as unknown as PluginBridge;
			const handle = win.__DIAPHANTIUM__?.plugins.register({ id: 'e2e-i18n', apiVersion: 1 });
			if (!handle) throw new Error('registration failed');

			const LABELS: Record<string, string> = { en: 'Packet mode', ru: 'Пакетный режим', uk: 'Пакетний режим' };
			const labelFor = (locale: string) => LABELS[locale] ?? LABELS.en!;

			const registerRow = () =>
				handle.addSettingsToggle({
					id: 'row',
					label: labelFor(handle.features.language()),
					getChecked: () => false,
					onChange: () => {},
				});

			registerRow();
			handle.features.onLanguageChange(() => registerRow());
		});

		await page.keyboard.press('Slash');
		await clicker.themeTab('plugins').click();
		await expect(clicker.popup.locator('.option__label', { hasText: 'Packet mode' })).toBeVisible();

		await clicker.themeTab('settings').click();
		await clicker.languageSelect.click();
		await clicker.languageOption('ru').click();

		await clicker.themeTab('plugins').click();
		await expect(clicker.popup.locator('.option__label', { hasText: 'Пакетный режим' })).toBeVisible();
		await expect(clicker.popup.locator('.option__label', { hasText: 'Packet mode' })).toHaveCount(0);

		await clicker.themeTab('settings').click();
		await clicker.languageSelect.click();
		await clicker.languageOption('en').click();

		await clicker.themeTab('plugins').click();
		await expect(clicker.popup.locator('.option__label', { hasText: 'Packet mode' })).toBeVisible();
	});

	test('a feature action provider replaces the default press, and the default resumes once disposed', async ({ clicker, page }) => {
		await page.evaluate(() => {
			const win = window as unknown as PluginBridge;
			const handle = win.__DIAPHANTIUM__?.plugins.register({ id: 'e2e-override', apiVersion: 1 });
			if (!handle) throw new Error('registration failed');
			let overrideCalls = 0;
			win.__overrideCalls = () => overrideCalls;
			win.__disposeOverride = handle.features.provideAction('mines', () => {
				overrideCalls++;
			});
		});

		await page.keyboard.press('Slash');

		const started = await clicker.now();
		await clicker.control('mines').click();
		await expect.poll(() => page.evaluate(() => (window as unknown as PluginBridge).__overrideCalls?.())).toBeGreaterThan(0);
		expect(await clicker.keysSince(started)).toEqual([]);

		await page.evaluate(() => (window as unknown as PluginBridge).__disposeOverride?.());
		const beforeDefault = await clicker.now();
		await expect.poll(async () => (await clicker.keysSince(beforeDefault)).some(key => key.code === 'Digit5')).toBe(true);

		await clicker.control('mines').click();
	});
});

test.describe('plugin API readiness', () => {
	test.skip(legacyBundle, 'plugin API is new');

	test('a call before the clicker loads is refused, and onReady fires once it is ready', async ({ clicker, page }) => {
		await page.addInitScript(() => {
			const win = window as unknown as PluginBridge;
			const readyQueue: Array<() => void> = [];
			Object.defineProperty(window, '__DIAPHANTIUM__', {
				value: Object.freeze({
					version: null,
					plugins: {
						register: () => null,
						onReady: (callback: () => void) => readyQueue.push(callback),
						__readyQueue: readyQueue,
					},
				}),
				writable: false,
				configurable: false,
			});

			const tooEarly = win.__DIAPHANTIUM__?.plugins.register({ id: 'e2e-early', apiVersion: 1 });
			(window as unknown as { __tooEarly?: unknown }).__tooEarly = tooEarly;

			win.__DIAPHANTIUM__?.plugins.onReady(() => {
				(window as unknown as { __becameReady?: boolean }).__becameReady = true;
			});
		});

		await clicker.load();

		expect(await page.evaluate(() => (window as unknown as { __tooEarly?: unknown }).__tooEarly)).toBeNull();
		expect(await page.evaluate(() => (window as unknown as { __becameReady?: boolean }).__becameReady)).toBe(true);

		const registeredAfterReady = await page.evaluate(() => {
			const win = window as unknown as PluginBridge;
			return win.__DIAPHANTIUM__?.plugins.register({ id: 'e2e-late', apiVersion: 1 }) !== null;
		});
		expect(registeredAfterReady).toBe(true);
	});
});
