import { BUILD_VERSION, expect, legacyBundle, test } from './support/fixtures';

test.describe('panel texts', () => {
	test('shows every label of every tab', async ({ clicker, page }) => {
		await clicker.load();
		await page.keyboard.press('Slash');

		await expect(clicker.tabTitle('clicker')).toHaveText('Clicker');
		await expect(clicker.sectionTitles('clicker')).toHaveText(legacyBundle ? 'Chose supplies to click' : 'Choose supplies to click');
		await expect(clicker.optionLabels('clicker')).toHaveText(['Click supplies', 'Delay for mines (ms)', 'Click mines']);

		await clicker.tab('miscellaneous').click();
		await expect(clicker.tabTitle('miscellaneous')).toHaveText('Miscellaneous');
		await expect(clicker.optionLabels('miscellaneous')).toHaveText(['Anti-AFK', legacyBundle ? 'Auto-delete' : 'Auto self-destruct']);

		await clicker.tab('settings').click();
		await expect(clicker.tabTitle('settings')).toHaveText('Settings');
		await expect(clicker.sectionTitles('settings')).toHaveText(['Hotkeys', 'Appearance']);
		await expect(clicker.hotkeyLabels).toHaveText(['Open menu', 'Click supplies', 'Click mines']);
		await expect(clicker.signatureOptionLabel).toHaveText('Show signature');

		await expect(clicker.signature).toHaveText('Powered by OrakomoRi');
	});

	test('falls back to English for a language without a translation', async ({ clicker, page }) => {
		await clicker.load(undefined, '?locale=de');
		await page.keyboard.press('Slash');

		await expect(clicker.tabTitle('clicker')).toHaveText('Clicker');
		await expect(clicker.optionLabels('clicker')).toHaveText(['Click supplies', 'Delay for mines (ms)', 'Click mines']);
	});
});

test.describe('panel language', () => {
	test.skip(legacyBundle, 'the panel was English only');

	test('follows the game language when set to auto', async ({ clicker, page }) => {
		await clicker.load(undefined, '?locale=uk');
		await page.keyboard.press('Slash');

		await expect(clicker.tabTitle('clicker')).toHaveText('Клікер');
		await expect(clicker.supply('1')).toHaveAttribute('aria-label', 'Ремкомплект');
	});

	for (const theme of ['classic', 'liquid']) {
		test(`switches the language from the select at once and remembers it in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme }, '?locale=en');
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();

			await clicker.languageSelect.click();
			await expect(clicker.languageOptions).toHaveCount(4);
			await clicker.languageOption('ru').click();

			await expect(clicker.languageSelect).toHaveText('Русский');
			await expect(clicker.themeTab('clicker')).toHaveAttribute('aria-label', 'Кликер');
			await expect.poll(async () => (await clicker.storedConfig())?.language).toBe('ru');
			await expect(clicker.dialog).toHaveCount(1);

			await clicker.languageSelect.click();
			await page.keyboard.press('Escape');
			await expect(clicker.languageOptions.first()).toBeHidden();
			await expect(clicker.dialog).toHaveCount(1);

			await page.keyboard.press('Escape');
			await expect(clicker.popup).toHaveCount(0);
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await expect(clicker.themeTab('settings')).toHaveAttribute('aria-label', 'Настройки');
		});

		test(`keeps the size of the settings controls in every language in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme }, '?locale=en');
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();

			const measure = async () => {
				await expect.poll(() => clicker.layoutMorphNodes()).toBe(0);
				const boxes = await Promise.all([clicker.languageSelect, clicker.themeOptions.first(), clicker.themeOptions.last(), clicker.themeTab('clicker')].map(locator => locator.boundingBox()));
				return boxes.map(box => ({ width: Math.round(box!.width), height: Math.round(box!.height) }));
			};

			const english = await measure();
			for (const language of ['ru', 'uk']) {
				await clicker.languageSelect.click();
				await clicker.languageOption(language).click();
				await expect(clicker.languageOptions.first()).toBeHidden();
				expect(await measure(), language).toEqual(english);
			}
		});

		test(`opens the language list exactly as wide as its field in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme }, '?locale=uk');
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();
			await clicker.languageSelect.click();
			await expect(clicker.languageList).toHaveAttribute('data-state', 'open');
			await expect.poll(() => clicker.languageList.evaluate(element => element.getAnimations().length)).toBe(0);

			const field = (await clicker.languageSelect.boundingBox())!;
			const list = (await clicker.languageList.boundingBox())!;
			expect(Math.abs(list.width - field.width)).toBeLessThan(1);
			expect(Math.abs(list.x - field.x)).toBeLessThan(1);
		});

		test(`highlights only the languages that can be chosen in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme, language: 'ru' });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();
			await clicker.languageSelect.click();
			await expect.poll(() => clicker.languageList.evaluate(element => element.getAnimations().length)).toBe(0);
			const highlight = clicker.languageList.locator('.select__highlight');
			const shown = () => highlight.evaluate(element => Number(getComputedStyle(element).opacity));

			await clicker.languageOption('uk').hover();
			await expect.poll(shown).toBeGreaterThan(0.9);

			await clicker.languageOption('ru').hover({ force: true });
			await expect.poll(shown).toBeLessThan(0.01);
			await expect(clicker.languageOption('ru')).toHaveCSS('pointer-events', 'none');

			await page.keyboard.press('Home');
			await expect(clicker.languageOption('auto')).toHaveAttribute('data-highlighted');
			await expect.poll(shown).toBeGreaterThan(0.9);
			await page.keyboard.press('ArrowDown');
			await page.keyboard.press('ArrowDown');
			await expect(clicker.languageOption('ru')).toHaveAttribute('data-highlighted');
			await expect.poll(shown).toBeLessThan(0.01);
			await page.keyboard.press('ArrowDown');
			await expect(clicker.languageOption('uk')).toHaveAttribute('data-highlighted');
			await expect.poll(shown).toBeGreaterThan(0.9);
		});

		test(`animates the layout when the language changes and cleans up after it in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme }, '?locale=en');
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();
			await clicker.languageSelect.click();

			await clicker.activeTheme.evaluate(host => {
				const seen = { nodes: 0, faded: 0 };
				Object.assign(window, { __layoutMorph: seen });
				const started = performance.now();
				const sample = () => {
					const nodes = [...(host.shadowRoot?.querySelectorAll<HTMLElement>('*') ?? [])].filter(element => element.style.transformOrigin !== '');
					seen.nodes = Math.max(seen.nodes, nodes.length);
					seen.faded = Math.max(seen.faded, nodes.filter(element => element.style.opacity !== '' && Number(element.style.opacity) < 1).length);
					if (performance.now() - started < 1500) requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});
			await clicker.languageOption('ru').click();

			const seen = () => page.evaluate(() => (window as unknown as { __layoutMorph: { nodes: number; faded: number } }).__layoutMorph);
			await expect.poll(async () => (await seen()).nodes).toBeGreaterThan(5);
			await expect.poll(async () => (await seen()).faded).toBeGreaterThan(0);
			await expect(clicker.themeTab('clicker')).toHaveAttribute('aria-label', 'Кликер');
			await expect.poll(() => clicker.layoutMorphNodes()).toBe(0);
		});
	}

	test('shows the liquid tabs as icons named by their labels', async ({ clicker, page }) => {
		await clicker.load({ theme: 'liquid' }, '?locale=ru');
		await page.keyboard.press('Slash');
		await clicker.grabPanel();

		for (const [name, label] of [['clicker', 'Кликер'], ['miscellaneous', 'Разное'], ['settings', 'Настройки'], ['about', 'О скрипте']] as const) {
			await expect(clicker.themeTab(name)).toHaveText('');
			await expect(clicker.themeTab(name)).toHaveAttribute('aria-label', label);
		}
	});
});

test.describe('about', () => {
	test.skip(legacyBundle, 'the about tab is new');

	for (const theme of ['classic', 'liquid']) {
		test(`shows the version, the author and a link to the repository in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme, language: 'en' });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('about').click();

			await expect(clicker.about('version')).toHaveText(BUILD_VERSION);
			await expect(clicker.about('released')).toHaveText(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
			await expect(clicker.about('author')).toHaveText('OrakomoRi');
			await expect(clicker.about('repository')).toHaveAttribute('href', 'https://github.com/OrakomoRi/Diaphantium');
			await expect(clicker.about('repository')).toHaveAttribute('target', '_blank');
		});
	}
});
