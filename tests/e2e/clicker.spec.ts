import { expect, legacyBundle, test } from './support/fixtures';

const CLICK_SUPPLY_1 = ['keydown 1 Digit1 49 49', 'keyup 1 Digit1 49 49'];
const CLICK_SUPPLY_3 = ['keydown 3 Digit3 51 51', 'keyup 3 Digit3 51 51'];

test.describe('panel', () => {
	test.beforeEach(async ({ clicker }) => {
		await clicker.load();
	});

	test('opens and closes with the menu hotkey and blocks page scroll while open', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');

		await expect(clicker.popup).toBeVisible();
		await expect(page.locator('html')).toHaveClass('diaphantium-popup-open');
		await expect(page.locator('body')).toHaveClass('diaphantium-popup-open');
		await expect(clicker.content('clicker')).toBeVisible();

		await page.keyboard.press('Slash');

		await expect(clicker.popup).toHaveCount(0);
		await expect(page.locator('html')).not.toHaveClass('diaphantium-popup-open');
	});

	test('closes on a click outside the panel but not on a click inside it', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');

		await clicker.tabTitle('clicker').click();
		await expect(clicker.popup).toBeVisible();

		await page.mouse.click(5, 5);
		await expect(clicker.popup).toHaveCount(0);
	});

	test('keeps one host element and animates the panel in and out of it', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the persistent host and the animated presence came with the shadow root');
		await expect(clicker.host).toHaveCount(1);
		await expect(clicker.popup).toHaveCount(0);
		const states = await clicker.recordPanelStates();

		await page.keyboard.press('Slash');
		await expect(clicker.popup).toBeVisible();
		await expect.poll(states).toEqual(['opening', 'open']);

		await page.keyboard.press('Slash');
		await expect(clicker.popup).toHaveCount(0);
		expect(await states()).toEqual(['opening', 'open', 'closing', 'removed']);
		await expect(clicker.host).toHaveCount(1);
	});

	test('reverses the close animation in place when the menu hotkey is pressed during it', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the persistent host and the animated presence came with the shadow root');
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		const states = await clicker.recordPanelStates();
		const dialog = await clicker.dialog.elementHandle();

		await page.keyboard.press('Slash');
		await page.keyboard.press('Slash');

		await expect.poll(states).toEqual(['closing', 'opening', 'open']);
		await expect(clicker.popup).toHaveCount(1);
		await expect(clicker.popup).toBeVisible();
		expect(await clicker.dialog.evaluate((element, previous) => element === previous, dialog)).toBe(true);
		await expect(page.locator('html')).toHaveClass('diaphantium-popup-open');
	});

	test('does not pass the closing press to the page', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the persistent host and the Transition came with the shadow root');
		await page.evaluate(() => {
			const presses: string[] = [];
			Object.defineProperty(window, '__pagePresses', { value: presses });
			for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) document.addEventListener(type, () => presses.push(type));
		});
		await page.keyboard.press('Slash');
		await clicker.grabPanel();

		await page.mouse.click(5, 5);
		await expect(clicker.popup).toHaveCount(0);
		expect(await page.evaluate(() => (window as unknown as { __pagePresses: string[] }).__pagePresses)).toEqual([]);

		await page.mouse.click(5, 5);
		await expect.poll(() => page.evaluate(() => (window as unknown as { __pagePresses: string[] }).__pagePresses)).toContain('click');
	});

	test('opens as a modal dialog and closes on Escape', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the panel became a dialog after the TypeScript migration');
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		expect(await clicker.dialog.evaluate(element => element.matches(':modal'))).toBe(true);

		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
		await expect(page.locator('html')).not.toHaveClass('diaphantium-popup-open');
	});

	test('saves a typed mine delay when the panel is closed without confirming it', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the panel became a dialog after the TypeScript migration');
		await page.keyboard.press('Slash');
		const delay = clicker.delay;
		await delay.fill('275');

		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
		await expect.poll(async () => (await clicker.storedConfig())?.mineDelay).toBe(275);
	});

	test('keeps Escape for the hotkey field while a hotkey is being assigned', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the panel became a dialog after the TypeScript migration');
		await page.keyboard.press('Slash');
		await clicker.tab('settings').click();

		await clicker.hotkey('Click mines').click();
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);
		await expect(clicker.popup).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(clicker.popup).toHaveCount(0);
	});

	test('passes real key presses but no mouse events to the page while open', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the panel became a dialog after the TypeScript migration');
		await page.evaluate(() => {
			const seen: string[] = [];
			Object.defineProperty(window, '__pageEvents', { value: seen });
			for (const type of ['keydown', 'keyup', 'pointerdown', 'pointermove', 'mousedown', 'mousemove', 'mouseup', 'click', 'wheel', 'contextmenu']) {
				window.addEventListener(type, () => seen.push(type));
			}
		});
		const seen = () => page.evaluate(() => [...(window as unknown as { __pageEvents: string[] }).__pageEvents]);

		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		const opened = (await seen()).length;

		await page.keyboard.press('KeyW');
		await page.mouse.move(600, 500);
		await page.mouse.wheel(0, 200);
		await page.mouse.click(600, 500, { button: 'right' });
		const box = await clicker.popup.boundingBox();
		if (!box) throw new Error('The panel is not rendered');
		await page.mouse.move(box.x + 20, box.y + 20);
		await page.mouse.click(box.x + 20, box.y + 20);
		await expect(clicker.popup).toBeVisible();

		// a plain key the panel does not claim reaches the game exactly like a movement key held when the panel opens
		expect((await seen()).slice(opened)).toEqual(['keydown', 'keyup']);
	});

	test('is not affected by the page stylesheets', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the persistent host came with the shadow root');
		await page.addStyleTag({ content: '.popup, .popup__positioner, .popup__theme, .popup__window, .popup__nav, .tab-panel, .option, .toggle, .switch, .supply { display: none !important; }' });
		await page.keyboard.press('Slash');

		await expect(clicker.popup).toBeVisible();
		await expect(clicker.supply('1')).toBeVisible();
		await expect(clicker.checkbox('supplies')).toBeVisible();
	});

	test('ignores the menu hotkey while an input of the page has focus', async ({ clicker, page }) => {
		await page.evaluate(() => document.body.append(Object.assign(document.createElement('input'), { id: 'chat' })));
		await page.locator('#chat').press('Slash');

		await expect(clicker.popup).toHaveCount(0);
	});

	test('stores the default supplies and hotkeys on the first open', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');

		await expect.poll(() => clicker.storedConfig()).toMatchObject({
			clickValues: ['1', '2', '3', '4'].map(key => ({ key, value: 'off' })),
			hotkeys: [{ action: 'Open menu', value: 'Slash' }],
		});
	});

	test('clicks the selected supplies while supply clicking is enabled', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');
		await clicker.supply('1').click();
		await clicker.supply('3').click();

		await expect(clicker.supply('1')).toHaveAttribute('data-state', 'on');
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'off');
		await expect.poll(async () => (await clicker.storedConfig())?.clickValues).toEqual([
			{ key: '1', value: 'on' },
			{ key: '2', value: 'off' },
			{ key: '3', value: 'on' },
			{ key: '4', value: 'off' },
		]);

		const started = await clicker.now();
		await clicker.checkbox('supplies').check();
		await expect.poll(() => clicker.keySignatures(started)).toEqual([...CLICK_SUPPLY_1, ...CLICK_SUPPLY_3].sort());
		await expect.poll(async () => (await clicker.storedConfig())?.clickSuppliesState).toBe(true);

		await clicker.checkbox('supplies').uncheck();
		await page.waitForTimeout(100);
		const stopped = await clicker.now();
		await page.waitForTimeout(200);

		expect(await clicker.keysSince(stopped)).toEqual([]);
		await expect.poll(async () => (await clicker.storedConfig())?.clickSuppliesState).toBe(false);
	});

	test('rejects a mine delay that is not a whole number and restores the previous one', async ({ clicker, page }) => {
		test.skip(!legacyBundle, 'the field accepts only digits and rejects only values out of range now');
		await page.keyboard.press('Slash');
		const delay = clicker.delay;
		await expect(delay).toHaveValue('100');

		await delay.fill('12a');
		await delay.press('Enter');
		await expect(clicker.flagged(delay, 'invalid')).toHaveCount(1);
		await expect(delay).toHaveValue('100');
		await expect(clicker.flagged(delay, 'invalid')).toHaveCount(0);

		await delay.fill('250');
		await delay.press('Enter');
		await expect.poll(async () => (await clicker.storedConfig())?.mineDelay).toBe(250);
	});

	test('keeps only digits in the mine delay and rejects a delay out of range', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'digit filtering and the range came after the TypeScript migration');
		await page.keyboard.press('Slash');
		const delay = clicker.delay;
		await expect(delay).toHaveValue('100');

		await delay.fill('1a2-b');
		await expect(delay).toHaveValue('12');
		await delay.pressSequentially('x3');
		await expect(delay).toHaveValue('123');

		await delay.fill('60001');
		await delay.press('Enter');
		await expect(clicker.flagged(delay, 'invalid')).toHaveCount(1);
		await expect(delay).toHaveValue('100');
		await expect(clicker.flagged(delay, 'invalid')).toHaveCount(0);

		await delay.fill('');
		await delay.press('Enter');
		await expect(clicker.flagged(delay, 'invalid')).toHaveCount(1);
		await expect(delay).toHaveValue('100');

		await delay.fill('250');
		await delay.press('Enter');
		await expect.poll(async () => (await clicker.storedConfig())?.mineDelay).toBe(250);
	});

	test('switches tabs and keeps only the inactive tabs focusable', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');

		await clicker.tab('settings').click();
		await expect(clicker.content('settings')).toBeVisible();
		await expect(clicker.content('clicker')).toBeHidden();
		if (legacyBundle) await expect(clicker.tab('settings')).not.toHaveAttribute('tabindex');
		else await expect(clicker.tab('settings')).toHaveAttribute('tabindex', '-1');
		await expect(clicker.tab('clicker')).toHaveAttribute('tabindex', '0');

		await clicker.tab('miscellaneous').focus();
		await page.keyboard.press('Enter');
		await expect(clicker.content('miscellaneous')).toBeVisible();
	});

	test('assigns hotkeys, flags duplicates, rejects digits 1 to 5 and resets', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');
		await clicker.tab('settings').click();

		await clicker.hotkey('Click supplies').click();
		await page.keyboard.press('KeyQ');
		await expect(clicker.hotkey('Click supplies')).toHaveValue('KeyQ');
		await expect(clicker.hotkey('Click supplies')).toHaveAttribute('data-code', 'KeyQ');
		await expect(clicker.hotkey('Click supplies')).not.toBeFocused();

		await clicker.hotkey('Click mines').click();
		await page.keyboard.press('KeyQ');
		await expect(clicker.flagged(clicker.hotkey('Click supplies'), 'duplicate')).toHaveCount(1);
		await expect(clicker.flagged(clicker.hotkey('Click mines'), 'duplicate')).toHaveCount(1);

		await clicker.hotkey('Click mines').click();
		await page.keyboard.press('Digit3');
		await expect(clicker.flagged(clicker.hotkey('Click mines'), 'invalid')).toHaveCount(1);
		await expect(clicker.hotkey('Click mines')).toHaveValue('KeyQ');

		await clicker.hotkeyReset('Click mines').click();
		await expect(clicker.hotkey('Click mines')).toHaveValue('');
		await expect(clicker.hotkey('Click mines')).not.toHaveAttribute('data-code');
		await expect(clicker.flagged(clicker.hotkey('Click supplies'), 'duplicate')).toHaveCount(0);

		await clicker.hotkey('Open menu').click();
		await page.keyboard.press('KeyP');
		await expect(clicker.hotkey('Open menu')).toHaveValue('KeyP');
		await clicker.hotkey('Open menu').click();
		await page.keyboard.press('Escape');
		await expect(clicker.hotkey('Open menu')).toHaveValue('Slash');

		await expect.poll(async () => (await clicker.storedConfig())?.hotkeys).toEqual([
			{ action: 'Open menu', value: 'Slash' },
			{ action: 'Click supplies', value: 'KeyQ' },
		]);
	});

	test('rejects movement, Space and Delete as hotkeys', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'the extended reserved keys came with the tooltips');
		await page.keyboard.press('Slash');
		await clicker.tab('settings').click();

		for (const key of ['KeyW', 'KeyD', 'ArrowLeft', 'Space', 'Delete']) {
			await clicker.hotkey('Click mines').click();
			await page.keyboard.press(key);
			await expect(clicker.flagged(clicker.hotkey('Click mines'), 'invalid')).toHaveCount(1);
			await expect(clicker.hotkey('Click mines')).toHaveValue('');
			await expect(clicker.flagged(clicker.hotkey('Click mines'), 'invalid')).toHaveCount(0);
		}
	});

	test('toggles supplies with 1 to 4 only while the clicker tab is open', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'panel supply keys came with the tooltips');
		const pageKeys = await page.evaluate(() => {
			const seen: string[] = [];
			Object.defineProperty(window, '__pageKeys', { value: seen });
			document.addEventListener('keydown', event => {
				if (event.isTrusted) seen.push(event.code);
			});
		}).then(() => () => page.evaluate(() => [...(window as unknown as { __pageKeys: string[] }).__pageKeys]));
		await page.keyboard.press('Slash');
		await clicker.grabPanel();

		await page.keyboard.press('Digit2');
		await page.keyboard.press('Numpad4');
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'on');
		await expect(clicker.supply('4')).toHaveAttribute('data-state', 'on');
		await page.keyboard.press('Digit2');
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'off');
		await expect(clicker.supply('1')).toHaveAttribute('data-state', 'off');

		await clicker.tab('settings').click();
		await page.keyboard.press('Digit1');
		await clicker.tab('clicker').click();
		await expect(clicker.supply('1')).toHaveAttribute('data-state', 'off');

		expect((await pageKeys()).filter(code => code !== 'Slash')).toEqual([]);
		await expect.poll(async () => (await clicker.storedConfig())?.clickValues).toEqual([
			{ key: '1', value: 'off' },
			{ key: '2', value: 'off' },
			{ key: '3', value: 'off' },
			{ key: '4', value: 'on' },
		]);
	});

	test('explains the mine delay and the hotkey rules in tooltips', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'tooltips are new');
		await page.keyboard.press('Slash');
		await clicker.grabPanel();

		await clicker.delay.hover();
		await expect(clicker.tooltip).toBeVisible();
		await expect(clicker.tooltip).toContainText('Digits only, from 0 to 60000');

		await clicker.supply('3').hover();
		await expect(clicker.tooltip).toContainText(legacyBundle ? 'Double damage' : 'Double Damage');
		await expect(clicker.tooltip).toContainText('3');

		await clicker.supply('3').click();
		await expect(clicker.tooltip).toBeHidden();

		await clicker.tab('settings').click();
		await clicker.hotkey('Click mines').hover();
		await expect(clicker.tooltip).toContainText('Game keys are not allowed: 1–5, WASD, arrows, Space, Delete');
	});

	test('does not react to hotkeys pressed by scripts, including its own key presses', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'synthetic key filtering came with the extended reserved keys');
		await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Slash', key: '/', bubbles: true })));
		await page.waitForTimeout(300);
		await expect(clicker.popup).toHaveCount(0);
	});

	test('hides the signature and remembers it for the next open', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');
		await clicker.tab('settings').click();

		await clicker.checkbox('show-signature').uncheck();
		await expect(clicker.hiddenSignature).toHaveCount(1);
		await expect.poll(async () => (await clicker.storedConfig())?.showSignature).toBe(false);

		await page.keyboard.press('Slash');
		await page.keyboard.press('Slash');
		await expect(clicker.hiddenSignature).toHaveCount(1);
	});

	test('taps the arrow keys for anti-AFK and presses Delete for auto-delete', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');
		await clicker.tab('miscellaneous').click();

		const antiAfkStarted = await clicker.now();
		await clicker.checkbox('anti-afk').check();
		await expect.poll(() => clicker.keySignatures(antiAfkStarted), { timeout: 3000 }).toEqual([
			'keydown ArrowLeft ArrowLeft 37 37',
			'keydown ArrowRight ArrowRight 39 39',
			'keyup ArrowLeft ArrowLeft 37 37',
			'keyup ArrowRight ArrowRight 39 39',
		]);
		await clicker.checkbox('anti-afk').uncheck();

		const autoDeleteStarted = await clicker.now();
		await clicker.checkbox('auto-delete').check();
		await expect.poll(() => clicker.keySignatures(autoDeleteStarted)).toEqual(expect.arrayContaining(['keydown Delete Delete 46 46', 'keyup Delete Delete 46 46']));
		await clicker.checkbox('auto-delete').uncheck();

		await expect.poll(() => clicker.storedConfig()).toMatchObject({ antiAfkState: false, autoDeleteState: false });
	});

	test('moves with the mouse and reopens where it was left', async ({ clicker, page }) => {
		await page.keyboard.press('Slash');
		const grab = await clicker.grabPanel();

		await page.mouse.move(grab.x, grab.y);
		await page.mouse.down();
		await page.mouse.move(grab.x + 60, grab.y + 40, { steps: 4 });
		await page.mouse.up();

		const moved = await clicker.panelPosition();
		expect(moved).not.toEqual({ left: 100, top: 100 });
		await expect.poll(async () => {
			const coordinates = (await clicker.storedConfig())?.coordinates as { left: number; top: number } | undefined;
			return [coordinates?.left ?? NaN, coordinates?.top ?? NaN].map(value => Math.round(value));
		}).toEqual([Math.round(moved.left), Math.round(moved.top)]);

		await page.keyboard.press('Slash');
		await page.keyboard.press('Slash');
		await expect.poll(() => clicker.panelPosition()).toEqual(moved);
	});

	test('keeps the dragged position when closed right after a drag', async ({ clicker, page }) => {
		test.fail(legacyBundle, 'fixed in the TypeScript clicker: a pending save read the position of the removed panel');
		await page.keyboard.press('Slash');
		const grab = await clicker.grabPanel();

		await page.mouse.move(grab.x, grab.y);
		await page.mouse.down();
		await page.mouse.move(grab.x + 80, grab.y + 50, { steps: 4 });
		await page.mouse.up();
		const dragged = await clicker.panelPosition();
		expect(dragged).not.toEqual({ left: 100, top: 100 });
		await page.keyboard.press('Slash');
		await page.waitForTimeout(1200);

		expect((await clicker.storedConfig())?.coordinates).toMatchObject({ left: dragged.left, top: dragged.top });
	});

	test('keeps the dragged position when closed during a drag', async ({ clicker, page }) => {
		test.fail(legacyBundle, 'fixed in the TypeScript clicker: releasing the mouse after closing saved the position of the removed panel');
		await page.keyboard.press('Slash');
		const grab = await clicker.grabPanel();

		await page.mouse.move(grab.x, grab.y);
		await page.mouse.down();
		await page.mouse.move(grab.x + 30, grab.y + 30, { steps: 2 });
		const dragged = await clicker.panelPosition();
		expect(dragged).not.toEqual({ left: 100, top: 100 });
		await page.keyboard.press('Slash');
		await page.mouse.up();
		await page.waitForTimeout(1200);

		expect((await clicker.storedConfig())?.coordinates).toMatchObject({ left: dragged.left, top: dragged.top });
	});

	test('stops at the window edge and stays open when released outside the panel', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'edge margin, pointer capture and anchors came with the new movement logic');
		await page.keyboard.press('Slash');
		const viewport = page.viewportSize();
		if (!viewport) throw new Error('No viewport');

		await clicker.dragPanelTo(viewport.width - 1, viewport.height - 1);

		const size = await clicker.panelSize();
		expect(await clicker.panelPosition()).toEqual({ left: viewport.width - size.width - 8, top: viewport.height - size.height - 8 });
		await expect(clicker.popup).toBeVisible();
		await expect.poll(async () => (await clicker.storedConfig())?.coordinates).toEqual({
			left: viewport.width - size.width - 8,
			top: viewport.height - size.height - 8,
			anchor: { ax: 'right', x: 8, ay: 'bottom', y: 8 },
		});
	});

	test('keeps its distance to the nearest edges when the window is resized', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'edge margin, pointer capture and anchors came with the new movement logic');
		await page.keyboard.press('Slash');
		const viewport = page.viewportSize();
		if (!viewport) throw new Error('No viewport');
		await clicker.dragPanelTo(viewport.width - 1, viewport.height - 1);
		const size = await clicker.panelSize();

		await page.setViewportSize({ width: viewport.width - 200, height: viewport.height - 100 });
		await expect.poll(() => clicker.panelPosition()).toEqual({ left: viewport.width - 200 - size.width - 8, top: viewport.height - 100 - size.height - 8 });

		await page.keyboard.press('Slash');
		await page.keyboard.press('Slash');
		await expect.poll(() => clicker.panelPosition()).toEqual({ left: viewport.width - 200 - size.width - 8, top: viewport.height - 100 - size.height - 8 });
	});

	test('does not move when the press starts on a control', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'edge margin, pointer capture and anchors came with the new movement logic');
		await page.keyboard.press('Slash');
		await clicker.grabPanel();
		const box = await clicker.supply('1').boundingBox();
		if (!box) throw new Error('The supply is not rendered');

		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + 120, box.y + 90, { steps: 4 });
		await page.mouse.up();

		expect(await clicker.panelPosition()).toEqual({ left: 100, top: 100 });
	});
});

test.describe('saved configuration', () => {
	const saved = {
		coordinates: { top: 120, left: 200 },
		clickValues: [
			{ key: '1', value: 'off' },
			{ key: '2', value: 'on' },
			{ key: '3', value: 'off' },
			{ key: '4', value: 'on' },
		],
		clickSuppliesState: false,
		mineDelay: 150,
		antiAfkState: false,
		autoDeleteState: false,
		hotkeys: [
			{ action: 'Open menu', value: 'KeyP' },
			{ action: 'Click supplies', value: 'KeyQ' },
			{ action: 'Click mines', value: 'KeyM' },
		],
		showSignature: false,
	};

	test('resumes supply clicking and auto-delete that were enabled', async ({ clicker, page }) => {
		await clicker.load({ ...saved, clickSuppliesState: true, autoDeleteState: true });

		await expect.poll(() => clicker.keySignatures(0)).toEqual(expect.arrayContaining([
			'keydown 2 Digit2 50 50',
			'keydown 4 Digit4 52 52',
			'keydown Delete Delete 46 46',
		]));
		expect(await clicker.keySignatures(0)).not.toContain('keydown 1 Digit1 49 49');

		await page.keyboard.press('KeyP');
		await expect(clicker.checkbox('supplies')).toBeChecked();
		await clicker.tab('miscellaneous').click();
		await expect(clicker.checkbox('auto-delete')).toBeChecked();
		await expect(clicker.checkbox('anti-afk')).not.toBeChecked();
	});

	test('opens with the saved hotkey, position, delay and signature', async ({ clicker, page }) => {
		await clicker.load(saved);

		await page.keyboard.press('Slash');
		await expect(clicker.popup).toHaveCount(0);

		await page.keyboard.press('KeyP');
		await expect.poll(() => clicker.panelPosition()).toEqual({ left: 200, top: 120 });
		await expect(clicker.delay).toHaveValue('150');
		await expect(clicker.supply('2')).toHaveAttribute('data-state', 'on');
		await expect(clicker.hiddenSignature).toHaveCount(1);
	});

	test('opens inside the window when the saved position is outside it', async ({ clicker, page }) => {
		test.skip(legacyBundle, 'edge margin, pointer capture and anchors came with the new movement logic');
		await clicker.load({ ...saved, coordinates: { top: 5000, left: -300 } });
		const viewport = page.viewportSize();
		if (!viewport) throw new Error('No viewport');

		await page.keyboard.press('KeyP');
		const size = await clicker.panelSize();
		await expect.poll(() => clicker.panelPosition()).toEqual({ left: 8, top: viewport.height - size.height - 8 });
		expect((await clicker.storedConfig())?.coordinates).toEqual({ top: 5000, left: -300 });
	});

	test('toggles supply clicking and mine placing with their hotkeys while closed', async ({ clicker, page }) => {
		await clicker.load(saved);

		const suppliesStarted = await clicker.now();
		await page.keyboard.press('KeyQ');
		await expect.poll(() => clicker.keySignatures(suppliesStarted)).toEqual(['keydown 2 Digit2 50 50', 'keydown 4 Digit4 52 52', 'keyup 2 Digit2 50 50', 'keyup 4 Digit4 52 52']);
		await page.keyboard.press('KeyQ');

		await page.waitForTimeout(100);
		const minesStarted = await clicker.now();
		await page.keyboard.press('KeyM');
		await expect.poll(async () => (await clicker.keysSince(minesStarted)).filter(entry => entry.type === 'keydown' && entry.key === '5').length, { timeout: 2000 }).toBeGreaterThanOrEqual(3);
		await page.keyboard.press('KeyM');

		const presses = (await clicker.keysSince(minesStarted)).filter(entry => entry.type === 'keydown' && entry.key === '5');
		const gaps = presses.slice(1).map((entry, index) => entry.at - (presses[index]?.at ?? entry.at));
		expect(Math.min(...gaps)).toBeGreaterThanOrEqual(140);
		expect(await clicker.keySignatures(minesStarted)).toEqual(['keydown 5 Digit5 53 53', 'keyup 5 Digit5 53 53']);
	});

	test('exposes the clicker instance on window', async ({ clicker, page }) => {
		await clicker.load(saved);

		const features = await page.evaluate(() => Object.keys((window as unknown as { clickerInstance: { features: object } }).clickerInstance.features));
		expect(features).toEqual(['supplies', 'mines', 'antiAfk', 'autoDelete']);
	});
});
