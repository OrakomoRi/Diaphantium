import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';
import type { PanelShell } from '@/clicker/ui/model/panel';

const CONFIG_KEY = 'Diaphantium.config';

async function freshScale() {
	vi.resetModules();
	return import('@/clicker/ui/model/scale');
}

async function mountSetting(selectInterfaceScale: PanelShell['selectInterfaceScale'], initial = 100) {
	const { useInterfaceScaleSetting } = await freshScale();
	const { PANEL_SHELL } = await import('@/clicker/ui/model/panel');
	const interfaceScale = ref(initial);
	let setting!: ReturnType<typeof useInterfaceScaleSetting>;
	const app = createApp(defineComponent({
		setup() {
			setting = useInterfaceScaleSetting();
			return () => h('div');
		},
	}));
	app.provide(PANEL_SHELL, { interfaceScale, selectInterfaceScale } as unknown as PanelShell);
	app.mount(document.createElement('div'));
	return { setting, interfaceScale, app };
}

describe('interface scale', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('choices', () => {
		it('offers 80, 100, 125, 150 and 200 percent with 100 as the default', async () => {
			const { INTERFACE_SCALES, DEFAULT_INTERFACE_SCALE } = await freshScale();

			expect([...INTERFACE_SCALES]).toEqual([80, 100, 125, 150, 200]);
			expect(DEFAULT_INTERFACE_SCALE).toBe(100);
		});

		it('accepts only the listed percentages', async () => {
			const { isInterfaceScale } = await freshScale();

			for (const valid of [80, 100, 125, 150, 200]) expect(isInterfaceScale(valid)).toBe(true);
			for (const invalid of [0, 79, 90, 175, 250, -100, Number.NaN, Infinity, '100', null, undefined, {}]) expect(isInterfaceScale(invalid)).toBe(false);
		});

		it('turns a percentage into a scale factor', async () => {
			const { scaleFactor } = await freshScale();

			expect([80, 100, 125, 150, 200].map(percent => scaleFactor(percent as 80))).toEqual([0.8, 1, 1.25, 1.5, 2]);
		});
	});

	describe('stored value', () => {
		it('is 100 when nothing is stored', async () => {
			const { storedInterfaceScale } = await freshScale();

			expect(storedInterfaceScale()).toBe(100);
		});

		it('reads a stored percentage', async () => {
			localStorage.setItem(CONFIG_KEY, JSON.stringify({ interfaceScale: 150 }));
			const { storedInterfaceScale } = await freshScale();

			expect(storedInterfaceScale()).toBe(150);
		});

		it.each([175, '150', null, -1, 0, true])('falls back to 100 for a stored %j', async value => {
			localStorage.setItem(CONFIG_KEY, JSON.stringify({ interfaceScale: value }));
			const { storedInterfaceScale } = await freshScale();

			expect(storedInterfaceScale()).toBe(100);
		});

		it('keeps an older config without the field working', async () => {
			localStorage.setItem(CONFIG_KEY, JSON.stringify({ theme: 'liquid', language: 'ru', mineDelay: 250 }));
			const { storedInterfaceScale } = await freshScale();

			expect(storedInterfaceScale()).toBe(100);
		});
	});

	describe('setting', () => {
		it('lists every choice with its percent sign', async () => {
			const { setting, app } = await mountSetting(vi.fn());

			expect(setting.options).toEqual([
				{ id: '80', label: '80%' },
				{ id: '100', label: '100%' },
				{ id: '125', label: '125%' },
				{ id: '150', label: '150%' },
				{ id: '200', label: '200%' },
			]);
			app.unmount();
		});

		it('follows the scale the panel has chosen', async () => {
			const { setting, interfaceScale, app } = await mountSetting(vi.fn(), 125);

			expect(setting.choice.value).toBe('125');
			interfaceScale.value = 200;
			expect(setting.choice.value).toBe('200');
			app.unmount();
		});

		it('asks the panel for the percentage of the chosen option', async () => {
			const select = vi.fn();
			const { setting, app } = await mountSetting(select);

			setting.select('150');

			expect(select).toHaveBeenCalledExactlyOnceWith(150);
			app.unmount();
		});

		it.each(['', 'auto', '90', '1e2', 'NaN'])('ignores the option %j', async id => {
			const select = vi.fn();
			const { setting, app } = await mountSetting(select);

			setting.select(id);

			expect(select).not.toHaveBeenCalled();
			app.unmount();
		});
	});
});
