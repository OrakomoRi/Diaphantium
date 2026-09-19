import type { Page } from '@playwright/test';
import { expect, legacyBundle, test, type ClickerPage } from './support/fixtures';

const THEMES = ['classic', 'liquid'] as const;
const TOP_LEFT = { top: 60, left: 60, anchor: { ax: 'left', x: 60, ay: 'top', y: 60 } };
const BOTTOM_RIGHT = { top: 400, left: 800, anchor: { ax: 'right', x: 40, ay: 'bottom', y: 40 } };

interface PluginBridge {
	__DIAPHANTIUM__?: { plugins: { register(manifest: { id: string; apiVersion: number }): { addSettingsToggle(row: { id: string; label: string; getChecked: () => boolean; onChange: (checked: boolean) => void }): void } | null } };
}

async function open(clicker: ClickerPage, page: Page, config: Record<string, unknown>, viewport = { width: 1500, height: 1100 }): Promise<void> {
	await page.setViewportSize(viewport);
	await clicker.load(config);
	await page.keyboard.press('Slash');
	await clicker.grabPanel();
}

async function panelBox(clicker: ClickerPage): Promise<{ x: number; y: number; width: number; height: number }> {
	const box = await clicker.positioner.boundingBox();
	if (!box) throw new Error('The panel is not rendered');
	return box;
}

function layoutSize(clicker: ClickerPage): Promise<{ width: number; height: number }> {
	return clicker.positioner.evaluate(element => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
}

async function chooseScale(clicker: ClickerPage, percent: number): Promise<void> {
	await clicker.scaleSelect.click();
	await clicker.scaleOption(percent).click();
}

async function settled(clicker: ClickerPage): Promise<void> {
	await expect.poll(async () => {
		const first = await panelBox(clicker);
		await clicker.page.waitForTimeout(120);
		const second = await panelBox(clicker);
		return Math.abs(first.width - second.width) + Math.abs(first.x - second.x) + Math.abs(first.y - second.y) + Math.abs(first.height - second.height);
	}).toBeLessThan(0.01);
}

function near(actual: number, expected: number, tolerance = 1): void {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function insideWindow(box: { x: number; y: number; width: number; height: number }, viewport: { width: number; height: number }): void {
	expect(box.x).toBeGreaterThanOrEqual(-0.5);
	expect(box.y).toBeGreaterThanOrEqual(-0.5);
	expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
	expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
}

test.describe('interface size', () => {
	test.skip(legacyBundle, 'the interface size is new');

	for (const theme of THEMES) {
		test.describe(theme, () => {
			test('offers 80, 100, 125, 150 and 200 percent and starts at 100', async ({ clicker, page }) => {
				await open(clicker, page, { theme });
				await clicker.themeTab('settings').click();

				await expect(clicker.scaleSelect).toHaveText('100%');
				await clicker.scaleSelect.click();
				await expect(clicker.scaleOptions).toHaveText(['80%', '100%', '125%', '150%', '200%']);
				await expect(clicker.scaleOption(100)).toHaveAttribute('data-state', 'checked');
			});

			test('scales the whole panel around its anchored corner and remembers the choice', async ({ clicker, page }) => {
				await open(clicker, page, { theme, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);
				const before = await panelBox(clicker);
				const base = await layoutSize(clicker);

				await chooseScale(clicker, 150);
				await settled(clicker);

				const after = await panelBox(clicker);
				near(after.width, base.width * 1.5);
				near(after.x, before.x);
				near(after.y, before.y);
				await expect(clicker.scaleSelect).toHaveText('150%');
				await expect.poll(async () => (await clicker.storedConfig())?.interfaceScale).toBe(150);
			});

			test('keeps a bottom-right corner in place while the panel grows and shrinks', async ({ clicker, page }) => {
				const viewport = { width: 1600, height: 1500 };
				await open(clicker, page, { theme, coordinates: BOTTOM_RIGHT }, viewport);
				await clicker.themeTab('settings').click();
				await settled(clicker);
				const before = await panelBox(clicker);

				for (const percent of [200, 80, 100]) {
					await chooseScale(clicker, percent);
					await settled(clicker);
					const after = await panelBox(clicker);
					near(after.x + after.width, before.x + before.width);
					near(after.y + after.height, before.y + before.height);
					insideWindow(after, viewport);
				}
			});

			test('opens at the stored size', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 125, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);

				const base = await layoutSize(clicker);
				near((await panelBox(clicker)).width, base.width * 1.25);
				await expect(clicker.scaleSelect).toHaveText('125%');
			});

			test('falls back to 100% for a stored size that is not offered', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 175, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);

				const base = await layoutSize(clicker);
				near((await panelBox(clicker)).width, base.width);
				await expect(clicker.scaleSelect).toHaveText('100%');
			});

			for (const viewport of [{ width: 1280, height: 720 }, { width: 900, height: 520 }, { width: 640, height: 420 }]) {
				test(`stays inside a ${viewport.width}x${viewport.height} window at 200%`, async ({ clicker, page }) => {
					await open(clicker, page, { theme, interfaceScale: 200, coordinates: TOP_LEFT }, viewport);
					await settled(clicker);
					insideWindow(await panelBox(clicker), viewport);

					await clicker.themeTab('settings').click();
					await settled(clicker);
					insideWindow(await panelBox(clicker), viewport);

					await clicker.scaleSelect.click();
					await expect(clicker.scaleList).toBeVisible();
					insideWindow((await clicker.scaleList.boundingBox())!, viewport);
				});
			}

			test('draws smaller than chosen in a window that cannot hold it, and returns to the chosen size when the window grows', async ({ clicker, page }) => {
				const drawnScale = () => clicker.positioner.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
				await open(clicker, page, { theme, interfaceScale: 200, coordinates: TOP_LEFT }, { width: 640, height: 300 });
				await settled(clicker);

				expect(await drawnScale()).toBeLessThan(2);
				expect(await drawnScale()).toBeGreaterThan(0.25);
				insideWindow(await panelBox(clicker), { width: 640, height: 300 });
				await clicker.themeTab('settings').click();
				await expect(clicker.scaleSelect).toHaveText('200%');

				await page.setViewportSize({ width: 1500, height: 1100 });
				await expect.poll(drawnScale).toBeCloseTo(2, 3);
				insideWindow(await panelBox(clicker), { width: 1500, height: 1100 });
			});

			test('grows and shrinks through in-between sizes and settles on the chosen one', async ({ clicker, page }) => {
				await open(clicker, page, { theme, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);
				await clicker.positioner.evaluate(element => {
					const samples: number[] = [];
					Object.defineProperty(window, '__scaleSamples', { value: samples, configurable: true });
					const started = performance.now();
					const sample = () => {
						samples.push(new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
						if (performance.now() - started < 2200) requestAnimationFrame(sample);
					};
					requestAnimationFrame(sample);
				});

				await chooseScale(clicker, 150);
				await page.waitForTimeout(2300);

				const samples = await page.evaluate(() => (window as unknown as { __scaleSamples: number[] }).__scaleSamples);
				const distinct = [...new Set(samples.map(value => Math.round(value * 1000)))];
				expect(distinct.length).toBeGreaterThan(6);
				expect(samples.at(-1)).toBeCloseTo(1.5, 5);
				for (let index = 1; index < samples.length; index++) expect(samples[index]!).toBeGreaterThanOrEqual(samples[index - 1]! - 0.05);
			});

			test('leaves no layer that keeps a stale bitmap of an earlier size', async ({ clicker, page }) => {
				await open(clicker, page, { theme, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await chooseScale(clicker, 200);
				await settled(clicker);

				const promoted = await clicker.host.evaluate(host => {
					const found: string[] = [];
					const visit = (root: ParentNode) => {
						for (const element of root.querySelectorAll<HTMLElement>('*')) {
							if (getComputedStyle(element).willChange.includes('transform') && !element.classList.contains('select__highlight')) {
								found.push(`${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`);
							}
							if (element.shadowRoot) visit(element.shadowRoot);
						}
					};
					if (host.shadowRoot) visit(host.shadowRoot);
					return found;
				});
				expect(promoted).toEqual([]);
			});

			test('scales the hints with the panel and keeps them next to their control', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 200, coordinates: TOP_LEFT });
				await settled(clicker);

				await clicker.supply('1').hover();
				await expect(clicker.tooltip).toHaveCSS('opacity', '1');
				await settled(clicker);

				const tooltip = (await clicker.tooltip.boundingBox())!;
				const trigger = (await clicker.supply('1').boundingBox())!;
				const own = await clicker.tooltip.evaluate(element => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
				near(tooltip.width, own.width * 2);
				near(tooltip.height, own.height * 2);
				insideWindow(tooltip, { width: 1500, height: 1100 });
				const apart = tooltip.y + tooltip.height <= trigger.y + 1 || tooltip.y >= trigger.y + trigger.height - 1 || tooltip.x + tooltip.width <= trigger.x + 1 || tooltip.x >= trigger.x + trigger.width - 1;
				expect(apart).toBe(true);
			});

			test('opens its lists as wide as their field at any size', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 150, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);

				await clicker.languageSelect.click();
				await expect(clicker.languageList).toBeVisible();
				await settled(clicker);
				const field = (await clicker.languageSelect.boundingBox())!;
				const list = (await clicker.languageList.boundingBox())!;
				near(list.width, field.width);
				near(list.x, field.x);
				insideWindow(list, { width: 1500, height: 1100 });
			});

			test('scales the settings a plugin adds along with the rest', async ({ clicker, page }) => {
				await open(clicker, page, { theme, coordinates: TOP_LEFT });
				await page.evaluate(() => {
					const handle = (window as unknown as PluginBridge).__DIAPHANTIUM__?.plugins.register({ id: 'scale-plugin', apiVersion: 1 });
					handle?.addSettingsToggle({ id: 'row', label: 'Scaled plugin row', getChecked: () => false, onChange: () => undefined });
				});
				await clicker.themeTab('plugins').click();
				const label = clicker.popup.getByText('Scaled plugin row');
				await expect(label).toBeVisible();
				await settled(clicker);
				const small = (await label.boundingBox())!;

				await clicker.themeTab('settings').click();
				await chooseScale(clicker, 200);
				await settled(clicker);
				await clicker.themeTab('plugins').click();
				await expect(label).toBeVisible();
				await settled(clicker);

				const large = (await label.boundingBox())!;
				expect(large.height / small.height).toBeCloseTo(2, 1);
				expect(large.width / small.width).toBeCloseTo(2, 1);
				const panel = await panelBox(clicker);
				expect(large.x).toBeGreaterThanOrEqual(panel.x);
				expect(large.x + large.width).toBeLessThanOrEqual(panel.x + panel.width);
			});

			test('drags the enlarged panel and keeps it inside the window', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 200, coordinates: TOP_LEFT });
				await settled(clicker);

				await clicker.dragPanelTo(1490, 1090);
				await settled(clicker);
				const dragged = await panelBox(clicker);
				insideWindow(dragged, { width: 1500, height: 1100 });
				expect(dragged.x + dragged.width).toBeGreaterThan(1400);

				await expect.poll(async () => ((await clicker.storedConfig())?.coordinates as { anchor?: { ax: string } } | undefined)?.anchor?.ax).toBe('right');
			});

			test('still animates a language change at an enlarged size and leaves nothing behind', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 150, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);

				await clicker.languageSelect.click();
				await clicker.languageOption('ru').click();
				await expect(clicker.languageSelect).toHaveText('Русский');
				await expect.poll(() => clicker.layoutMorphNodes()).toBe(0);
				await settled(clicker);
				insideWindow(await panelBox(clicker), { width: 1500, height: 1100 });
			});

			test('keeps the size and the corner through a theme switch', async ({ clicker, page }) => {
				await open(clicker, page, { theme, interfaceScale: 150, coordinates: TOP_LEFT });
				await clicker.themeTab('settings').click();
				await settled(clicker);
				const other = theme === 'classic' ? 'liquid' : 'classic';

				await clicker.themeOption(other).click();
				await expect.poll(() => clicker.themeLayers()).toEqual([other]);
				await settled(clicker);

				const box = await panelBox(clicker);
				const base = await layoutSize(clicker);
				near(box.width, base.width * 1.5);
				near(box.x, 60);
				near(box.y, 60);
				await expect(clicker.scaleSelect).toHaveText('150%');
			});
		});
	}
});
