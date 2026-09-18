import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, type Locator, type Page } from '@playwright/test';

export { expect } from '@playwright/test';

export const legacyBundle = process.env.DIAPHANTIUM_LEGACY === '1';

const BUNDLE_DIR = resolve(process.env.DIAPHANTIUM_BUNDLE_DIR ?? 'dist');
const GAME_ORIGIN = 'https://tankionline.test';
const GAME_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Tanki Online</title></head><body></body></html>';

export const CONFIG_KEY = 'Diaphantium.config';
export const USERSCRIPT_VERSION = '5.0.2+build.13';
export const CLICKER_STUB = 'window.__clickerRuns = (window.__clickerRuns || 0) + 1;';

const NOTICE = legacyBundle
	? { notice: '.nu-modal', title: '.nu-title', text: '.nu-text', button: '.nu-btn' }
	: { notice: '[part~="toast"]', title: '[part~="title"]', text: '[part~="text"]', button: '[part~="button"]' };

const PANEL = legacyBundle
	? {
		host: '.popup_container.diaphantium[author="OrakomoRi"]',
		dialog: '.popup',
		positioner: '.popup',
		window: '.popup',
		tab: (name: string) => `.navigation .item[data-tab="${name}"]`,
		tabPanel: (name: string) => `.content[data-tab="${name}"]`,
		tabTitle: '.header',
		sectionTitle: '.subheader',
		optionLabel: '.label p',
		hotkeyLabel: '.hotkey_block .text',
		signatureOptionLabel: '.appearance_toggle p',
		switch: (name: string) => `.checkbox.${name.replaceAll('-', '_')}`,
		hotkey: (action: string) => `.hotkey[data-action="${action}"]`,
		hotkeyReset: (action: string) => `.refresh_hotkey[data-action="${action}"]`,
		delay: '.text_input.delay',
		supply: (key: string) => `.supply[data-key="${key}"]`,
		signature: '.popup_signature',
		hiddenSignature: '.popup_signature.hidden',
		tooltip: '.tooltip[role="tooltip"]',
		invalid: '.wrong_input',
		duplicate: '.warning',
	}
	: {
		host: '.diaphantium[author="OrakomoRi"]',
		dialog: 'dialog.popup',
		positioner: '.popup__positioner',
		window: '.popup__window',
		tab: (name: string) => `.popup__tab[data-tab="${name}"]`,
		tabPanel: (name: string) => `.tab-panel[data-tab="${name}"]`,
		tabTitle: '.tab-panel__title',
		sectionTitle: '.section__title',
		optionLabel: '.option .option__label',
		hotkeyLabel: '.hotkey .option__label',
		signatureOptionLabel: '.option:has([data-option="show-signature"]) .option__label',
		switch: (name: string) => `.switch[data-option="${name}"]`,
		hotkey: (action: string) => `.field--hotkey[data-action="${action}"]`,
		hotkeyReset: (action: string) => `.hotkey__reset[data-action="${action}"]`,
		delay: '.field--delay',
		supply: (key: string) => `.supply[data-key="${key}"]`,
		signature: '.popup__signature',
		hiddenSignature: '.popup__signature[aria-hidden="true"]',
		tooltip: '.tooltip[role="tooltip"]',
		invalid: '[aria-invalid="true"]',
		duplicate: '[data-duplicate]',
	};

export interface KeyRecord {
	type: 'keydown' | 'keyup';
	key: string;
	code: string;
	keyCode: number;
	which: number;
	at: number;
}

export interface ThemeSwitchLayer {
	theme: string;
	hostOpacity: number;
	hostClip: string;
	hostFilter: string;
	surfaces: Array<{ rect: { left: number; top: number; right: number; bottom: number }; opacity: number; transform: string }>;
	contents: number[];
}

export type ThemeSwitchFrame = ThemeSwitchLayer[];

export interface BridgeEvent {
	type: string;
	[field: string]: unknown;
}

export interface BridgeOptions {
	version?: string | null;
	source?: string;
	store?: Record<string, unknown>;
	stable?: unknown;
	clickerFails?: boolean;
	toastFails?: boolean;
	slowStore?: boolean;
}

export const BUILD_VERSION = (JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }).version;

function bundle(name: 'loader.min.js' | 'diaphantium.min.js' | 'update-toast.min.js'): string {
	return readFileSync(resolve(BUNDLE_DIR, name), 'utf8');
}

function optionalBundle(name: 'update-toast.min.js'): string {
	return existsSync(resolve(BUNDLE_DIR, name)) ? bundle(name) : '';
}

async function openGame(page: Page, query = ''): Promise<void> {
	await page.route(`${GAME_ORIGIN}/**`, route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: GAME_HTML }));
	await page.addInitScript(() => {
		const listeners: Array<{ target: string; type: string; listener: unknown; capture: boolean }> = [];
		const globalName = (target: EventTarget) => (target === window ? 'window' : target === document ? 'document' : null);
		const capture = (options: unknown) => (typeof options === 'boolean' ? options : Boolean((options as { capture?: boolean } | undefined)?.capture));
		const add = EventTarget.prototype.addEventListener;
		const remove = EventTarget.prototype.removeEventListener;
		EventTarget.prototype.addEventListener = function (type, listener, options) {
			const target = globalName(this);
			const once = typeof options === 'object' && options !== null && options.once;
			const fromPlaywright = String(new Error().stack).includes('InjectedScript');
			if (target && listener && !once && !fromPlaywright && !listeners.some(entry => entry.target === target && entry.type === type && entry.listener === listener && entry.capture === capture(options))) {
				listeners.push({ target, type, listener, capture: capture(options) });
			}
			return add.call(this, type, listener, options);
		};
		EventTarget.prototype.removeEventListener = function (type, listener, options) {
			const target = globalName(this);
			const index = listeners.findIndex(entry => entry.target === target && entry.type === type && entry.listener === listener && entry.capture === capture(options));
			if (index >= 0) listeners.splice(index, 1);
			return remove.call(this, type, listener, options);
		};
		let observing = 0;
		const Observer = window.ResizeObserver;
		window.ResizeObserver = class extends Observer {
			private active = false;
			override observe(...args: Parameters<ResizeObserver['observe']>) {
				if (!this.active) observing++;
				this.active = true;
				super.observe(...args);
			}
			override disconnect() {
				if (this.active) observing--;
				this.active = false;
				super.disconnect();
			}
		};
		let baseline: unknown[] = [];
		Object.defineProperty(window, '__markListenerBaseline', {
			value: () => {
				baseline = listeners.map(entry => entry.listener);
			},
		});
		Object.defineProperty(window, '__globalListeners', {
			value: () => ({
				listeners: listeners
					.filter(entry => !baseline.includes(entry.listener))
					.map(entry => `${entry.target} ${entry.type}${entry.capture ? ' capture' : ''}`)
					.sort(),
				observing,
			}),
		});

		const keys: unknown[] = [];
		const logs: string[] = [];
		Object.defineProperty(window, '__syntheticKeys', { value: keys });
		Object.defineProperty(window, '__logs', { value: logs });
		for (const type of ['keydown', 'keyup'] as const) {
			document.addEventListener(type, event => {
				if (!event.isTrusted) {
					keys.push({ type, key: event.key, code: event.code, keyCode: event.keyCode, which: event.which, at: performance.now() });
				}
			}, true);
		}
		const log = console.log.bind(console);
		console.log = (...args: unknown[]) => {
			logs.push(String(args[0]));
			log(...args);
		};
	});
	await page.goto(`${GAME_ORIGIN}/play/${query}`);
}

export class GamePage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	now(): Promise<number> {
		return this.page.evaluate(() => performance.now());
	}

	keysSince(mark: number): Promise<KeyRecord[]> {
		return this.page.evaluate(since => (window as unknown as { __syntheticKeys: KeyRecord[] }).__syntheticKeys.filter(entry => entry.at >= since), mark);
	}

	async keySignatures(mark: number): Promise<string[]> {
		const keys = await this.keysSince(mark);
		return [...new Set(keys.map(({ type, key, code, keyCode, which }) => `${type} ${key} ${code} ${keyCode} ${which}`))].sort();
	}

	globalListeners(): Promise<{ listeners: string[]; observing: number }> {
		return this.page.evaluate(() => (window as unknown as { __globalListeners: () => { listeners: string[]; observing: number } }).__globalListeners());
	}

	logs(): Promise<string[]> {
		return this.page.evaluate(() => [...(window as unknown as { __logs: string[] }).__logs]);
	}
}

export class ClickerPage extends GamePage {
	readonly host = this.page.locator(PANEL.host);
	readonly dialog = this.host.locator(PANEL.dialog);
	readonly positioner = this.host.locator(PANEL.positioner);
	readonly popup = this.host.locator(PANEL.window);
	readonly delay = this.popup.locator(PANEL.delay);
	readonly signature = this.popup.locator(PANEL.signature);
	readonly hiddenSignature = this.popup.locator(PANEL.hiddenSignature);
	readonly hotkeyLabels = this.popup.locator(PANEL.hotkeyLabel);
	readonly signatureOptionLabel = this.popup.locator(PANEL.signatureOptionLabel);
	readonly tooltip = this.host.locator(PANEL.tooltip);

	async load(config?: Record<string, unknown>, query = ''): Promise<void> {
		await openGame(this.page, query);
		if (config) {
			await this.page.evaluate(([key, value]) => localStorage.setItem(key, value), [CONFIG_KEY, JSON.stringify(config)] as const);
		}
		await this.page.evaluate(() => (window as unknown as { __markListenerBaseline: () => void }).__markListenerBaseline());
		await this.page.addScriptTag({ content: bundle('diaphantium.min.js') });
	}

	supply(key: string) {
		return this.popup.locator(PANEL.supply(key));
	}

	readonly activeTheme = this.host.locator('.popup__theme:not([inert])');

	themeOption(id: string) {
		return this.activeTheme.locator(`[data-theme-option="${id}"]`);
	}

	control(name: string) {
		return this.activeTheme.locator(`[data-option="${name}"]`);
	}

	themeTab(name: string) {
		return this.activeTheme.locator(`[role="tab"][data-tab="${name}"]`);
	}

	readonly themeOptions = this.activeTheme.locator('[data-theme-option]');
	readonly languageSelect = this.activeTheme.locator('[data-language-select]');
	readonly languageList = this.activeTheme.locator('[role="listbox"]');
	readonly languageOptions = this.activeTheme.locator('[role="option"][data-language-option]');
	readonly pluginSelect = this.activeTheme.locator('[data-plugin-select]');

	pluginOption(id: string) {
		return this.activeTheme.locator(`[role="option"][data-plugin-option="${id}"]`);
	}

	layoutMorphNodes(): Promise<number> {
		return this.activeTheme.evaluate(host => [...(host.shadowRoot?.querySelectorAll<HTMLElement>('*') ?? [])].filter(element => element.style.transformOrigin !== '').length);
	}

	languageOption(id: string) {
		return this.activeTheme.locator(`[role="option"][data-language-option="${id}"]`);
	}

	about(name: string) {
		return this.activeTheme.locator(`[data-about="${name}"]`);
	}

	async recordThemeSwitch(): Promise<void> {
		await this.host.evaluate(host => {
			const root = host.shadowRoot;
			if (!root) throw new Error('The host has no shadow root');
			const frames: ThemeSwitchFrame[] = [];
			const state = { frames, done: false };
			Object.defineProperty(window, '__themeSwitch', { value: state, configurable: true });
			const started = performance.now();
			let switched = false;
			const sample = () => {
				const layers = [...root.querySelectorAll<HTMLElement>('.popup__theme')];
				if (layers.length > 1) switched = true;
				frames.push(layers.map(layer => {
					const style = getComputedStyle(layer);
					return {
						theme: layer.getAttribute('data-theme') ?? '',
						hostOpacity: Number(style.opacity),
						hostClip: style.clipPath,
						hostFilter: style.filter,
						surfaces: [...(layer.shadowRoot?.querySelectorAll<HTMLElement>('[data-morph="surface"]') ?? [])].map(surface => {
							const box = surface.getBoundingClientRect();
							const surfaceStyle = getComputedStyle(surface);
							return { rect: { left: box.left, top: box.top, right: box.right, bottom: box.bottom }, opacity: Number(surfaceStyle.opacity), transform: surfaceStyle.transform };
						}),
						contents: [...(layer.shadowRoot?.querySelectorAll<HTMLElement>('[data-morph="content"]') ?? [])].map(content => Number(getComputedStyle(content).opacity)),
					};
				}));
				if ((switched && layers.length === 1) || performance.now() - started > 4000) {
					state.done = true;
					return;
				}
				requestAnimationFrame(sample);
			};
			requestAnimationFrame(sample);
		});
	}

	async themeSwitchFrames(): Promise<ThemeSwitchFrame[]> {
		await this.page.waitForFunction(() => (window as unknown as { __themeSwitch: { done: boolean } }).__themeSwitch.done, undefined, { polling: 'raf', timeout: 6000 });
		return this.page.evaluate(() => (window as unknown as { __themeSwitch: { frames: ThemeSwitchFrame[] } }).__themeSwitch.frames);
	}

	themeLayers(): Promise<string[]> {
		return this.host.evaluate(host => [...(host.shadowRoot?.querySelectorAll('.popup__theme') ?? [])].map(layer => layer.getAttribute('data-theme') ?? ''));
	}

	checkbox(name: string) {
		return this.popup.locator(PANEL.switch(name));
	}

	tab(name: string) {
		return this.popup.locator(PANEL.tab(name));
	}

	content(name: string) {
		return this.popup.locator(PANEL.tabPanel(name));
	}

	tabTitle(name: string) {
		return this.content(name).locator(PANEL.tabTitle);
	}

	sectionTitles(name: string) {
		return this.content(name).locator(`${PANEL.sectionTitle}:visible`);
	}

	optionLabels(name: string) {
		return this.content(name).locator(PANEL.optionLabel);
	}

	hotkey(action: string) {
		return this.popup.locator(PANEL.hotkey(action));
	}

	hotkeyReset(action: string) {
		return this.popup.locator(PANEL.hotkeyReset(action));
	}

	flagged(field: Locator, flag: 'invalid' | 'duplicate') {
		return field.and(this.page.locator(PANEL[flag]));
	}

	storedConfig(): Promise<Record<string, unknown> | null> {
		return this.page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), CONFIG_KEY);
	}

	async grabPanel(): Promise<{ x: number; y: number }> {
		if (legacyBundle) {
			await this.popup.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
		} else {
			await this.dialog.and(this.page.locator('[data-state="open"]')).waitFor();
		}
		const box = await this.popup.boundingBox();
		if (!box) throw new Error('The panel is not rendered');
		return { x: box.x + 4, y: box.y + box.height / 2 };
	}

	panelPosition(): Promise<{ left: number; top: number }> {
		if (legacyBundle) {
			return this.popup.evaluate(element => ({ left: parseFloat(element.style.left), top: parseFloat(element.style.top) }));
		}
		return this.positioner.evaluate(async element => {
			await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
			const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
			return { left: matrix.m41, top: matrix.m42 };
		});
	}

	visibleFocus(): Promise<string | null> {
		return this.host.evaluate(host => {
			let active = host.shadowRoot?.activeElement ?? null;
			while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
			if (!active || active.tagName === 'DIALOG' || !active.matches(':focus-visible')) return null;
			return `${active.tagName.toLowerCase()}.${[...active.classList].join('.')}`;
		});
	}

	async recordPanelStates(): Promise<() => Promise<string[]>> {
		await this.host.evaluate((host, selector) => {
			const seen: string[] = [];
			Object.defineProperty(window, '__panelStates', { value: seen });
			const root = host.shadowRoot;
			if (!root) throw new Error('The host has no shadow root');
			let dialog: Element | null = null;
			new MutationObserver(() => {
				const current = root.querySelector(selector);
				if (dialog && !current) seen.push('removed');
				dialog = current;
				const state = current?.getAttribute('data-state');
				if (state && seen.at(-1) !== state) seen.push(state);
			}).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] });
		}, PANEL.dialog);
		return () => this.page.evaluate(() => [...(window as unknown as { __panelStates: string[] }).__panelStates]);
	}

	panelSize(): Promise<{ width: number; height: number }> {
		return this.popup.evaluate(element => ({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }));
	}

	async dragPanelTo(x: number, y: number): Promise<void> {
		const grab = await this.grabPanel();
		await this.page.mouse.move(grab.x, grab.y);
		await this.page.mouse.down();
		await this.page.mouse.move(x, y, { steps: 4 });
		await this.page.mouse.up();
	}
}

export class LoaderPage extends GamePage {
	readonly toast = this.page.locator(NOTICE.notice);
	readonly toastTitle = this.page.locator(NOTICE.title);
	readonly toastText = this.page.locator(NOTICE.text);
	readonly toastButtons = this.page.locator(NOTICE.button);

	async start(options: BridgeOptions = {}, query = ''): Promise<void> {
		await this.page.addInitScript(({ version, source, store: seed, stable, clickerFails, toastFails, slowStore, clicker, updateToast }) => {
			const events: Array<Record<string, unknown>> = [];
			const store = new Map(Object.entries(seed ?? {}));
			const respond = (type: string, detail: object) => window.dispatchEvent(new CustomEvent(type, { detail }));
			const later = (callback: () => void) => (slowStore ? setTimeout(callback, 50) : callback());

			Object.defineProperty(window, '__bridge', { value: { events, store } });

			if (version !== null) {
				Object.defineProperty(window, '__DIAPHANTIUM__', {
					value: Object.freeze({ version: version ?? '5.0.2+build.13', ...(source ? { source } : {}) }),
					writable: false,
					configurable: false,
				});
			}

			window.addEventListener('diaphantium:fetch', event => {
				const { id, url, format } = (event as CustomEvent).detail;
				events.push({ type: 'fetch', url: String(url).replace(/([?&]t=)\d+/, '$1*'), format });
				setTimeout(() => {
					if (String(url).startsWith('https://diaphantium-builds.vercel.app/stable.json')) {
						respond('diaphantium:fetch:response', stable === undefined ? { id, error: 'Not found' } : { id, data: stable });
					} else if (String(url).split('?')[0]?.endsWith('/update-toast.min.js')) {
						respond('diaphantium:fetch:response', toastFails ? { id, error: 'Network error' } : { id, data: updateToast });
					} else if (clickerFails) {
						respond('diaphantium:fetch:response', { id, error: 'Network error' });
					} else {
						respond('diaphantium:fetch:response', { id, data: clicker });
					}
				}, 5);
			});

			window.addEventListener('diaphantium:store:get', event => {
				const { id, key, default: fallback } = (event as CustomEvent).detail;
				events.push({ type: 'store:get', key });
				later(() => respond('diaphantium:store:response', { id, value: store.has(key) ? store.get(key) : fallback }));
			});

			window.addEventListener('diaphantium:store:set', event => {
				const { key, value } = (event as CustomEvent).detail;
				events.push({ type: 'store:set', key, value });
				store.set(key, value);
			});

			window.addEventListener('diaphantium:update', event => {
				events.push({ type: 'update', hash: (event as CustomEvent).detail.hash });
			});

			window.addEventListener('diaphantium:open-tab', event => {
				events.push({ type: 'open-tab', url: (event as CustomEvent).detail.url });
			});
		}, { ...options, clicker: CLICKER_STUB, updateToast: optionalBundle('update-toast.min.js') });

		await openGame(this.page, query);
		await this.page.addScriptTag({ content: bundle('loader.min.js') });
	}

	events(): Promise<BridgeEvent[]> {
		return this.page.evaluate(() => [...(window as unknown as { __bridge: { events: BridgeEvent[] } }).__bridge.events]);
	}

	clickerRuns(): Promise<number> {
		return this.page.evaluate(() => (window as unknown as { __clickerRuns?: number }).__clickerRuns ?? 0);
	}

	injectedScripts(): Promise<Array<{ resource: string | null; content: string }>> {
		return this.page.evaluate(() => [...document.querySelectorAll('script[data-resource]')].map(script => ({
			resource: script.getAttribute('data-resource'),
			content: script.textContent ?? '',
		})));
	}
}

export const test = base.extend<{ clicker: ClickerPage; loader: LoaderPage }>({
	clicker: async ({ page }, use) => {
		await use(new ClickerPage(page));
	},
	loader: async ({ page }, use) => {
		await use(new LoaderPage(page));
	},
});
