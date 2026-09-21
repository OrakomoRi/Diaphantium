import { expect, legacyBundle, test } from './support/fixtures';

const CLICK_SUPPLY_2 = ['keydown 2 Digit2 50 50', 'keyup 2 Digit2 50 50'];

test.describe('themes', () => {
	test.skip(legacyBundle, 'themes are new');

	let errors: string[] = [];

	test.beforeEach(async ({ page }) => {
		errors = [];
		page.on('pageerror', error => errors.push(String(error)));
	});

	test.afterEach(() => {
		expect(errors).toEqual([]);
	});

	test('switches to liquid glass, keeps the open tab and reopens in the chosen theme', async ({ clicker, page }) => {
		await clicker.load();
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		await clicker.themeTab('settings').click();

		await clicker.themeOption('liquid').click();
		await expect.poll(() => clicker.themeLayers()).toEqual(['liquid']);
		await expect(clicker.content('settings')).toBeVisible();
		await expect.poll(async () => (await clicker.storedConfig())?.theme).toBe('liquid');

		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		expect(await clicker.themeLayers()).toEqual(['liquid']);
	});

	test('closes cleanly when closed right after a theme was chosen', async ({ clicker, page }) => {
		await clicker.load();
		const closed = await clicker.globalListeners();
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		await clicker.themeTab('settings').click();

		await clicker.themeOption('liquid').click();
		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
		expect(await clicker.globalListeners()).toEqual(closed);

		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		expect(await clicker.themeLayers()).toEqual(['liquid']);
		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
		expect(await clicker.globalListeners()).toEqual(closed);
	});

	test('reverses the switch when the previous theme is chosen before it ends', async ({ clicker, page }) => {
		await clicker.load();
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		await clicker.themeTab('settings').click();

		await clicker.themeOption('liquid').click();
		await page.waitForFunction(() => {
			const layers = [...(document.querySelector('.diaphantium')?.shadowRoot?.querySelectorAll<HTMLElement>('.popup__theme') ?? [])];
			return layers.length === 2 && !layers[1]?.inert;
		}, undefined, { polling: 'raf' });
		await clicker.host.evaluate(host => {
			const incoming = host.shadowRoot?.querySelectorAll<HTMLElement>('.popup__theme')[1];
			incoming?.shadowRoot?.querySelector<HTMLElement>('[data-theme-option="classic"]')?.click();
		});

		expect(await clicker.themeLayers()).toEqual(['classic', 'liquid']);
		await expect.poll(() => clicker.themeLayers()).toEqual(['classic']);
		await expect.poll(async () => (await clicker.storedConfig())?.theme).toBe('classic');
		await expect(clicker.control('show-signature')).toBeVisible();
	});

	test('morphs the glass surfaces and never fades, clips or filters a theme layer, so the blur stays', async ({ clicker, page }) => {
		await clicker.load();
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		await clicker.themeTab('settings').click();

		await expect(clicker.content('settings')).toBeVisible();
		await page.waitForTimeout(500);
		await clicker.recordThemeSwitch();
		await clicker.themeOption('liquid').click();
		const frames = (await clicker.themeSwitchFrames()).filter(frame => frame.length === 2);

		expect(frames.length).toBeGreaterThan(15);
		expect(frames.flat().filter(layer => layer.hostOpacity !== 1 || layer.hostClip !== 'none' || layer.hostFilter !== 'none')).toEqual([]);
		expect(frames.some(frame => frame.some(layer => layer.surfaces.some(surface => surface.transform !== 'none')))).toBe(true);
		expect(frames.filter(([outgoing, incoming]) => Math.min(Math.max(...(outgoing?.contents ?? [0])), Math.max(...(incoming?.contents ?? [0]))) > 0.05)).toEqual([]);
		expect(await clicker.activeTheme.evaluate(layer => [...(layer.shadowRoot?.querySelectorAll<HTMLElement>('[data-morph]') ?? [])].map(part => `${part.style.transform}|${part.style.opacity}`))).toEqual(['|', '|', '|']);
	});

	test('keeps the anchored corner in place and the panel inside the window while it changes theme', async ({ clicker, page }) => {
		await clicker.load({ coordinates: { top: 0, left: 0, anchor: { ax: 'right', x: 40, ay: 'bottom', y: 30 } } });
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		await clicker.themeTab('settings').click();
		const viewport = page.viewportSize();
		if (!viewport) throw new Error('No viewport');

		await expect(clicker.content('settings')).toBeVisible();
		await page.waitForTimeout(500);
		await clicker.recordThemeSwitch();
		await clicker.themeOption('liquid').click();
		const surfaces = (await clicker.themeSwitchFrames()).filter(frame => frame.length === 2).flat().flatMap(layer => layer.surfaces).filter(surface => surface.opacity > 0.01);

		expect(surfaces.length).toBeGreaterThan(15);
		expect(surfaces.filter(({ rect }) => Math.abs(viewport.width - rect.right - 40) > 1.5 || Math.abs(viewport.height - rect.bottom - 30) > 1.5)).toEqual([]);
		await expect.poll(() => clicker.themeLayers()).toEqual(['liquid']);
		const box = await clicker.popup.boundingBox();
		expect(Math.round(viewport.width - (box?.x ?? 0) - (box?.width ?? 0))).toBe(40);
		expect(Math.round(viewport.height - (box?.y ?? 0) - (box?.height ?? 0))).toBe(30);
	});

	test('keeps the panel inside the window when the new theme would not fit at the stored position', async ({ clicker, page }) => {
		const viewport = page.viewportSize();
		if (!viewport) throw new Error('No viewport');
		await clicker.load({ theme: 'liquid', coordinates: { top: 0, left: 0, anchor: { ax: 'left', x: viewport.width - 360, ay: 'top', y: 40 } } });
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		await clicker.themeTab('settings').click();

		await expect(clicker.content('settings')).toBeVisible();
		await page.waitForTimeout(500);
		await clicker.recordThemeSwitch();
		await clicker.themeOption('classic').click();
		const surfaces = (await clicker.themeSwitchFrames()).filter(frame => frame.length === 2).flat().flatMap(layer => layer.surfaces).filter(surface => surface.opacity > 0.01);

		expect(surfaces.length).toBeGreaterThan(15);
		expect(surfaces.filter(({ rect }) => rect.left < 7.5 || rect.top < 7.5 || rect.right > viewport.width - 7.5 || rect.bottom > viewport.height - 7.5)).toEqual([]);
		await expect.poll(() => clicker.themeLayers()).toEqual(['classic']);
		const box = await clicker.popup.boundingBox();
		expect(Math.round((box?.x ?? 0) + (box?.width ?? 0))).toBe(viewport.width - 8);
	});

	test('works in liquid glass: supplies, keys 1 to 4, delay and reserved hotkeys', async ({ clicker, page }) => {
		await clicker.load({ theme: 'liquid' });
		await page.keyboard.press('Slash');
		await clicker.grabPanel();

		await clicker.supply('2').click();
		await page.keyboard.press('Digit4');
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'on');
		await expect(clicker.supply('4')).toHaveAttribute('data-state', 'on');
		await page.keyboard.press('Digit4');
		await expect(clicker.supply('4')).toHaveAttribute('data-state', 'off');

		const started = await clicker.now();
		await clicker.control('supplies').click();
		await expect.poll(() => clicker.keySignatures(started)).toEqual([...CLICK_SUPPLY_2].sort());
		await clicker.control('supplies').click();

		await clicker.delay.fill('70000');
		await page.keyboard.press('Enter');
		await expect(clicker.flagged(clicker.delay, 'invalid')).toHaveCount(1);
		await expect(clicker.delay).toHaveValue('100');
		await clicker.delay.fill('250');
		await page.keyboard.press('Enter');
		await expect.poll(async () => (await clicker.storedConfig())?.mineDelay).toBe(250);

		await clicker.themeTab('settings').click();
		await clicker.hotkey('Click mines').click();
		await page.keyboard.press('KeyW');
		await expect(clicker.flagged(clicker.hotkey('Click mines'), 'invalid')).toHaveCount(1);
		await page.keyboard.press('KeyK');
		await expect(clicker.hotkey('Click mines')).toHaveAttribute('data-code', 'KeyK');
		await clicker.hotkeyReset('Click mines').click();
		await expect(clicker.hotkey('Click mines')).not.toHaveAttribute('data-code', /./);

		await clicker.themeTab('clicker').hover();
		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
	});

	test('keeps pressing supplies for the game while the panel is open and while it changes theme', async ({ clicker, page }) => {
		await clicker.load({ clickSuppliesState: true, clickValues: [{ key: '2', value: 'on' }] });
		await page.keyboard.press('Slash');
		await clicker.grabPanel();

		const open = await clicker.now();
		await page.waitForTimeout(200);
		expect(await clicker.keySignatures(open)).toEqual([...CLICK_SUPPLY_2].sort());
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'on');
		await expect(clicker.supply('1')).toHaveAttribute('data-state', 'off');

		await clicker.themeTab('settings').click();
		const switching = await clicker.now();
		await clicker.themeOption('liquid').click();
		await page.waitForTimeout(300);
		expect((await clicker.keysSince(switching)).length).toBeGreaterThan(4);
		await expect.poll(() => clicker.themeLayers()).toEqual(['liquid']);
		await clicker.themeTab('clicker').click();
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'on');
		await expect(clicker.supply('1')).toHaveAttribute('data-state', 'off');
	});
});

test.describe('focus', () => {
	test.skip(legacyBundle, 'the focus handling is new');

	for (const theme of ['classic', 'liquid']) {
		test(`shows no focus ring on a control pressed with the mouse after a key press in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();

			await clicker.supply('2').click();
			await page.keyboard.press('KeyQ');
			expect(await clicker.visibleFocus()).toBeNull();

			await clicker.themeTab('miscellaneous').click();
			await page.keyboard.press('ShiftLeft');
			expect(await clicker.visibleFocus()).toBeNull();

			await clicker.control('anti-afk').click();
			await page.keyboard.press('F3');
			expect(await clicker.visibleFocus()).toBeNull();

			await clicker.themeTab('clicker').click();
			await page.keyboard.press('Digit3');
			await expect(clicker.supply('3')).toHaveAttribute('data-state', 'on');
			expect(await clicker.visibleFocus()).toBeNull();

			await clicker.themeTab('settings').click();
			await expect(clicker.content('settings')).toBeVisible();
			await clicker.hotkey('Click mines').click();
			await page.keyboard.press('F3');
			await expect(clicker.hotkey('Click mines')).toHaveAttribute('data-code', 'F3');
			expect(await clicker.visibleFocus()).toBeNull();

			await clicker.hotkeyReset('Click mines').click();
			await expect(clicker.hotkey('Click mines')).not.toHaveAttribute('data-code', /./);
			await page.keyboard.press('KeyQ');
			expect(await clicker.visibleFocus()).toBeNull();

			await page.keyboard.press('Tab');
			expect(await clicker.visibleFocus()).not.toBeNull();
		});
	}
});

test.describe('motion', () => {
	test.skip(legacyBundle, 'JS-driven motion is new');

	for (const theme of ['classic', 'liquid']) {
		test(`moves the tooltip smoothly in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.tooltip.evaluate(element => {
				const seen = new Set<string>();
				Object.defineProperty(window, '__tooltipFrames', { value: seen, configurable: true });
				const sample = () => {
					const style = (element as HTMLElement).style;
					if (style.visibility === 'visible') seen.add(`${style.transform}|${style.opacity}`);
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});

			await clicker.supply('3').hover();
			await expect(clicker.tooltip).toBeVisible();
			await page.waitForTimeout(400);
			const frames = await page.evaluate(() => [...(window as unknown as { __tooltipFrames: Set<string> }).__tooltipFrames]);
			const positions = new Set(frames.map(frame => frame.split('|')[0]));
			expect(positions.size).toBeGreaterThan(8);
		});

		test(`does not change the size of supply buttons on hover in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			const sizes = () => Promise.all(['1', '2', '3', '4'].map(key => clicker.supply(key).evaluate(element => {
				const box = element.getBoundingClientRect();
				return `${box.width.toFixed(2)}x${box.height.toFixed(2)}`;
			})));
			const before = await sizes();

			for (const key of ['1', '2', '3', '4', '3', '2']) {
				await clicker.supply(key).hover();
				await page.waitForTimeout(60);
				expect(await sizes()).toEqual(before);
			}
		});

		test(`opens room for the signature before typing it and erases it before closing the room in ${theme}`, async ({ clicker, page }) => {
			await clicker.load({ theme, showSignature: false });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();
			await expect(clicker.content('settings')).toBeVisible();
			const settled = async () => {
				let previous = -1;
				await expect.poll(async () => {
					const { height } = await clicker.panelSize();
					const same = height === previous;
					previous = height;
					return same;
				}, { intervals: [150] }).toBe(true);
				return previous;
			};
			const closedHeight = await settled();
			expect(await clicker.signature.evaluate(element => (element.parentElement as HTMLElement).getBoundingClientRect().height)).toBe(0);

			await clicker.signature.evaluate(element => {
				const slot = element.parentElement as HTMLElement;
				const typed = element.querySelector('.popup__signature-typed') as HTMLElement;
				const frames: Array<[number, number]> = [];
				Object.defineProperty(window, '__signatureFrames', { value: frames, configurable: true });
				const sample = () => {
					frames.push([slot.getBoundingClientRect().height, typed.textContent?.length ?? 0]);
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});
			const frames = () => page.evaluate(() => [...(window as unknown as { __signatureFrames: Array<[number, number]> }).__signatureFrames]);

			await clicker.control('show-signature').click();
			await expect(clicker.signature).toHaveText('Powered by OrakomoRi', { timeout: 5000 });
			const shown = await frames();
			const full = Math.max(...shown.map(([height]) => height));
			expect(full).toBeGreaterThan(8);
			expect(shown.filter(([height, typed]) => typed > 0 && height < full - 1)).toEqual([]);
			expect((await clicker.panelSize()).height).toBeGreaterThan(closedHeight);

			const mark = shown.length;
			await clicker.control('show-signature').click();
			await expect.poll(async () => (await clicker.panelSize()).height).toBe(closedHeight);
			const hidden = (await frames()).slice(mark);
			expect(hidden.filter(([height, typed]) => typed > 0 && height < full - 1)).toEqual([]);
		});

		test(`fits a short and a narrow window and scrolls the tab instead in ${theme}`, async ({ clicker, page }) => {
			await page.setViewportSize({ width: 900, height: 340 });
			await clicker.load({ theme });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();
			const inside = () => clicker.popup.evaluate(element => {
				const box = element.getBoundingClientRect();
				return box.top >= 7.5 && box.left >= 7.5 && box.bottom <= window.innerHeight - 7.5 && box.right <= window.innerWidth - 7.5;
			});
			await expect.poll(inside).toBe(true);

			await clicker.control('show-signature').scrollIntoViewIfNeeded();
			await clicker.control('show-signature').click();
			await expect.poll(async () => (await clicker.storedConfig())?.showSignature).toBe(false);
			await expect.poll(inside).toBe(true);

			await page.setViewportSize({ width: 340, height: 640 });
			await expect.poll(inside).toBe(true);
		});
	}

	test('shows and erases the signature instantly with reduced motion', async ({ clicker, page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		for (const theme of ['classic', 'liquid']) {
			await clicker.load({ theme, showSignature: false });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();

			await clicker.control('show-signature').click();
			await expect(clicker.signature).toHaveText('Powered by OrakomoRi');
			if (theme === 'liquid') {
				const knob = clicker.control('show-signature').locator('.toggle__knob');
				expect(await knob.evaluate(element => (element as HTMLElement).style.transform)).not.toContain('scale');
			}

			await clicker.control('show-signature').click();
			await expect(clicker.hiddenSignature).toHaveText('');
		}
	});

	for (const [from, to] of [['classic', 'liquid'], ['liquid', 'classic']] as const) {
		test(`keeps typing and erasing the signature through a switch from ${from} to ${to}`, async ({ clicker, page }) => {
			await clicker.load({ theme: from, showSignature: false, language: 'en' });
			await page.keyboard.press('Slash');
			await clicker.grabPanel();
			await clicker.themeTab('settings').click();
			await expect(clicker.content('settings')).toBeVisible();

			await clicker.host.evaluate(host => {
				const frames: number[][] = [];
				Object.defineProperty(window, '__typedFrames', { value: frames, configurable: true });
				const sample = () => {
					frames.push([...(host.shadowRoot?.querySelectorAll('.popup__theme') ?? [])].map(layer => layer.shadowRoot?.querySelector('.popup__signature-typed')?.textContent?.length ?? -1));
					requestAnimationFrame(sample);
				};
				requestAnimationFrame(sample);
			});
			const frames = () => page.evaluate(() => [...(window as unknown as { __typedFrames: number[][] }).__typedFrames]);
			const typed = () => clicker.activeTheme.locator('.popup__signature-typed');
			const steps = (list: number[][]) => list.slice(1).map((lengths, index) => (lengths[0] ?? 0) - (list[index]?.[0] ?? 0));

			await clicker.control('show-signature').click();
			await expect.poll(async () => (await typed().textContent())?.length ?? 0).toBeGreaterThanOrEqual(4);
			const typing = (await frames()).length;
			await clicker.themeOption(to).click();
			await expect.poll(() => clicker.themeLayers()).toEqual([to]);
			await expect(typed()).toHaveText('Powered by OrakomoRi', { timeout: 5000 });

			const typingFrames = (await frames()).slice(typing);
			expect(typingFrames.filter(lengths => new Set(lengths).size > 1)).toEqual([]);
			expect(steps(typingFrames).filter(step => step < 0 || step > 2)).toEqual([]);
			expect(typingFrames[0]?.[0]).toBeGreaterThanOrEqual(4);

			await clicker.control('show-signature').click();
			await expect.poll(async () => (await typed().textContent())?.length ?? 20).toBeLessThanOrEqual(15);
			const erasing = (await frames()).length;
			await clicker.themeOption(from).click();
			await expect.poll(() => clicker.themeLayers()).toEqual([from]);
			await expect(typed()).toHaveText('', { timeout: 5000 });

			const erasingFrames = (await frames()).slice(erasing);
			expect(erasingFrames.filter(lengths => new Set(lengths).size > 1)).toEqual([]);
			expect(steps(erasingFrames).filter(step => step > 0 || step < -2)).toEqual([]);
			expect(erasingFrames[0]?.[0]).toBeLessThanOrEqual(15);
		});
	}
});
