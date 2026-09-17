import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

async function setup(config: Record<string, unknown> = {}) {
	localStorage.setItem('Diaphantium.config', JSON.stringify(config));
	vi.resetModules();
	const { default: Clicker } = await import('@/clicker/core/Clicker');
	const { createPluginApi } = await import('@/clicker/plugins/api');
	const registry = await import('@/clicker/plugins/registry');
	const clicker = new Clicker();
	const i18n = { mergeLocaleMessage: vi.fn(), setLocaleMessage: vi.fn() };
	const plugins = createPluginApi({ clicker, i18n });
	return { clicker, plugins, registry, i18n };
}

describe('plugin API', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('register', () => {
		it('refuses a missing or empty id', async () => {
			const { plugins } = await setup();
			// @ts-expect-error deliberately missing id
			expect(plugins.register({ apiVersion: 1 })).toBeNull();
			expect(plugins.register({ id: '', apiVersion: 1 })).toBeNull();
		});

		it('refuses an unsupported apiVersion', async () => {
			const { plugins } = await setup();
			// @ts-expect-error deliberately wrong version
			expect(plugins.register({ id: 'test-plugin', apiVersion: 2 })).toBeNull();
		});

		it('accepts a valid manifest', async () => {
			const { plugins } = await setup();
			const handle = plugins.register({ id: 'test-plugin', apiVersion: 1 });
			expect(handle).not.toBeNull();
		});
	});

	describe('features', () => {
		it('reads and follows the current enabled state', async () => {
			const { clicker, plugins } = await setup();
			const handle = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			expect(handle.features.isEnabled('supplies')).toBe(false);

			const seen: boolean[] = [];
			handle.features.onChange('supplies', enabled => seen.push(enabled));
			clicker.start('supplies');
			await nextTick();
			expect(seen).toEqual([true]);
			expect(handle.features.isEnabled('supplies')).toBe(true);
			clicker.stop('supplies');
		});

		it('lets exactly one plugin provide an action per feature, and refuses a conflicting second one', async () => {
			const { clicker, plugins } = await setup();
			const keys: string[] = [];
			document.addEventListener('keydown', event => keys.push(event.code));

			const first = plugins.register({ id: 'first', apiVersion: 1 })!;
			const second = plugins.register({ id: 'second', apiVersion: 1 })!;

			let firstCalls = 0;
			first.features.provideAction('mines', () => firstCalls++);

			let secondCalls = 0;
			const disposeSecond = second.features.provideAction('mines', () => secondCalls++);

			clicker.start('mines');
			expect(firstCalls).toBe(1);
			expect(secondCalls).toBe(0);
			expect(keys).toHaveLength(0);

			disposeSecond();
			vi.advanceTimersByTime(1000);
			expect(secondCalls).toBe(0);

			clicker.stop('mines');
		});

		it('returns control to the default action once the provider is disposed', async () => {
			const { clicker, plugins } = await setup();
			const keys: string[] = [];
			document.addEventListener('keydown', event => keys.push(event.code));

			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			let provided = 0;
			const dispose = plugin.features.provideAction('mines', () => provided++);

			clicker.start('mines');
			expect(provided).toBe(1);
			expect(keys).toHaveLength(0);

			dispose();
			vi.advanceTimersByTime(200);
			expect(keys).toContain('Digit5');
			clicker.stop('mines');
		});

		it('does not let a throwing action provider break the schedule', async () => {
			const { clicker, plugins } = await setup({ mineDelay: 100 });
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			let calls = 0;
			plugin.features.provideAction('mines', () => {
				calls++;
				throw new Error('boom');
			});

			clicker.start('mines');
			vi.advanceTimersByTime(300);
			expect(calls).toBeGreaterThan(1);
			clicker.stop('mines');
		});
	});

	describe('addSettingsToggle', () => {
		it('adds and removes a row from the shared registry', async () => {
			const { plugins, registry } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			const dispose = plugin.addSettingsToggle({ id: 'row', label: 'Row', getChecked: () => true, onChange: () => {} });

			expect(registry.settingsRows).toHaveLength(1);
			expect(registry.settingsRows[0]).toMatchObject({ id: 'row', pluginId: 'test-plugin', label: 'Row' });

			dispose();
			expect(registry.settingsRows).toHaveLength(0);
		});

		it('refuses a row missing a label or callbacks', async () => {
			const { plugins, registry } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			// @ts-expect-error deliberately invalid row
			plugin.addSettingsToggle({ id: 'row', getChecked: () => true, onChange: () => {} });
			expect(registry.settingsRows).toHaveLength(0);
		});

		it('does not let a throwing getChecked break the row', async () => {
			const { plugins } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			plugin.addSettingsToggle({
				id: 'row',
				label: 'Row',
				getChecked: () => {
					throw new Error('boom');
				},
				onChange: () => {},
			});
			const { settingsRows } = await import('@/clicker/plugins/registry');
			expect(settingsRows[0]!.getChecked()).toBe(false);
		});
	});

	describe('i18n', () => {
		it('namespaces added translations under the plugin id', async () => {
			const { plugins, i18n } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			plugin.i18n.addTranslations('en', { hello: 'world' });
			expect(i18n.mergeLocaleMessage).toHaveBeenCalledWith('en', { plugins: { 'test-plugin': { hello: 'world' } } });
		});

		it('registers a new language into the shared registry and locale store', async () => {
			const { plugins, i18n, registry } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			plugin.i18n.addLanguage({ id: 'eo', label: 'EO', name: 'Esperanto' }, { hello: 'saluton' });

			expect(registry.languages).toContainEqual({ id: 'eo', label: 'EO', name: 'Esperanto' });
			expect(registry.runtimeLocales.has('eo')).toBe(true);
			expect(i18n.setLocaleMessage).toHaveBeenCalledWith('eo', { plugins: { 'test-plugin': { hello: 'saluton' } } });
		});
	});

	describe('config', () => {
		it('reads a writable key, falling back to the built-in default when nothing is stored', async () => {
			const { plugins } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			expect(plugin.config.get('theme')).toBe('classic');
			expect(plugin.config.get('mineDelay')).toBe(100);
			expect(plugin.config.get('clickValues')).toEqual([]);
		});

		it('writes and reads back a valid value', async () => {
			const { plugins } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			expect(plugin.config.set('mineDelay', 500)).toBe(true);
			expect(plugin.config.get('mineDelay')).toBe(500);
			expect(plugin.config.set('theme', 'liquid')).toBe(true);
			expect(plugin.config.get('theme')).toBe('liquid');
		});

		it('refuses a key the plugin API does not expose', async () => {
			const { plugins } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			// @ts-expect-error deliberately not a plugin-writable key
			expect(plugin.config.set('clickSuppliesState', true)).toBe(false);
			// @ts-expect-error deliberately not a plugin-writable key
			expect(plugin.config.get('clickSuppliesState')).toBeUndefined();
		});

		it('refuses an out-of-range or malformed value without touching storage', async () => {
			const { plugins } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			expect(plugin.config.set('mineDelay', -5)).toBe(false);
			expect(plugin.config.set('mineDelay', 999999)).toBe(false);
			expect(plugin.config.get('mineDelay')).toBe(100);
			expect(plugin.config.set('theme', 'not-a-theme')).toBe(false);
			expect(plugin.config.set('clickValues', [{ key: '1', value: 'on' }])).toBe(true);
			expect(plugin.config.set('clickValues', [{ key: 'not-a-key', value: 'on' }])).toBe(false);
		});

		it('lets a language-adding plugin select its own language, and the built-in language() reflects it', async () => {
			const { plugins } = await setup();
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;
			plugin.i18n.addLanguage({ id: 'eo', label: 'EO', name: 'Esperanto' }, { hello: 'saluton' });

			expect(plugin.config.set('language', 'eo')).toBe(true);
			expect(plugin.config.get('language')).toBe('eo');
			expect(plugin.features.language()).toBe('eo');
		});

		it('falls back to the default once the plugin that owned a selected value is gone, without corrupting storage', async () => {
			const { plugins } = await setup({ language: 'eo' });
			const plugin = plugins.register({ id: 'test-plugin', apiVersion: 1 })!;

			expect(plugin.config.get('language')).toBe('auto');
			expect(plugin.features.language()).toBe('auto');
			expect(JSON.parse(localStorage.getItem('Diaphantium.config') ?? '{}').language).toBe('eo');
		});
	});

	describe('storage', () => {
		it('isolates a plugin\'s storage from the core config and from other plugins', async () => {
			const { plugins } = await setup();
			const first = plugins.register({ id: 'first', apiVersion: 1 })!;
			const second = plugins.register({ id: 'second', apiVersion: 1 })!;

			first.storage.set('count', 1);
			second.storage.set('count', 2);

			expect(first.storage.get('count')).toBe(1);
			expect(second.storage.get('count')).toBe(2);
			expect(JSON.parse(localStorage.getItem('Diaphantium.config') ?? '{}')).not.toHaveProperty('count');
		});
	});
});
