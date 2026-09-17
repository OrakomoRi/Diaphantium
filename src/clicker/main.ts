import pageCSS from './assets/css/diaphantium.page.css?inline';
import resetCSS from './assets/css/diaphantium.reset.css?inline';
import shellCSS from './assets/css/diaphantium.shell.css?inline';

import Popup from './core/Popup';
import Clicker from './core/Clicker';
import { installHotkeys } from './core/hotkeys';
import { logger } from './core/logger';
import { createClickerI18n } from './locales';
import { createPluginApi } from './plugins/api';

const style = document.createElement('style');
style.textContent = pageCSS;
document.head.append(style);

function exposePlugins(clicker: Clicker, i18n: ReturnType<typeof createClickerI18n>): void {
	const api = createPluginApi({ clicker, i18n: i18n.global });
	const ready = { ...api, onReady: (callback: () => void) => callback() };

	let queue: Array<() => void> = [];
	try {
		const existing = window.__DIAPHANTIUM__;
		const stub = existing?.plugins as { __readyQueue?: Array<() => void> } | undefined;
		queue = stub?.__readyQueue ?? [];
		if (existing?.plugins) Object.assign(existing.plugins, ready);
		else window.__DIAPHANTIUM__ = { version: existing?.version ?? null, plugins: ready };
	} catch (e) {
		logger.log(`Could not expose the plugin API on window.__DIAPHANTIUM__ - ${e}`, 'warn');
		return;
	}

	for (const callback of queue) {
		try {
			callback();
		} catch (e) {
			logger.log(`plugins.onReady callback threw - ${e}`, 'warn');
		}
	}
}

function initDiaphantium(): void {
	const clicker = new Clicker();
	const i18n = createClickerI18n();
	const popup = new Popup(resetCSS + shellCSS, feature => clicker.toggle(feature), i18n);

	installHotkeys({
		openMenu: () => popup.toggle(),
		clickSupplies: () => clicker.toggle('supplies'),
		clickMines: () => clicker.toggle('mines'),
	});

	exposePlugins(clicker, i18n);

	window.clickerInstance = clicker;
	logger.log('Clicker initialized.', 'success');
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initDiaphantium, { once: true });
} else {
	initDiaphantium();
}
