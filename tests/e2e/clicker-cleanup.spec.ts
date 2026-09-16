import { expect, legacyBundle, test } from './support/fixtures';

test.describe('panel cleanup', () => {
	test('leaves nothing behind in the page after closing', async ({ clicker, page }) => {
		test.fail(legacyBundle, 'fixed in the TypeScript clicker: every open added an empty text node to the page');
		await clicker.load();
		const nodesBefore = await page.evaluate(() => document.body.childNodes.length);

		for (let i = 0; i < 3; i++) {
			await page.keyboard.press('Slash');
			await expect(clicker.popup).toBeVisible();
			await page.keyboard.press('Slash');
			await expect(clicker.popup).toHaveCount(0);
		}

		expect(await page.evaluate(() => document.body.childNodes.length)).toBe(nodesBefore);
		await expect(page.locator('html')).not.toHaveClass(/diaphantium-popup-open/);
	});

	test('keeps only the hotkey and log listeners while closed and removes what the open panel added', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'listener cleanup came with the persistent host');
		await clicker.load();
		const closed = await clicker.globalListeners();
		expect(closed).toEqual({ listeners: ['document diaphantium:log', 'document keydown'], observing: 0 });

		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		expect(await clicker.globalListeners()).toEqual({ listeners: ['document diaphantium:log', 'document keydown', 'window resize'], observing: 2 });

		await clicker.tab('settings').click();
		await clicker.hotkey('Click mines').click();
		await page.keyboard.press('Digit3');
		await clicker.dragPanelTo(400, 300);
		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);

		expect(await clicker.globalListeners()).toEqual(closed);
	});
});
