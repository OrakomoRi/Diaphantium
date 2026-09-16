import pageCSS from './assets/css/diaphantium.page.css?inline';
import resetCSS from './assets/css/diaphantium.reset.css?inline';
import shellCSS from './assets/css/diaphantium.shell.css?inline';

import Popup from './core/Popup';
import Clicker from './core/Clicker';
import { installHotkeys } from './core/hotkeys';
import { logger } from './core/logger';

const style = document.createElement('style');
style.textContent = pageCSS;
document.head.append(style);

function initDiaphantium(): void {
	const clicker = new Clicker();
	const popup = new Popup(resetCSS + shellCSS, feature => clicker.toggle(feature));

	installHotkeys({
		openMenu: () => popup.toggle(),
		clickSupplies: () => clicker.toggle('supplies'),
		clickMines: () => clicker.toggle('mines'),
	});

	window.clickerInstance = clicker;
	logger.log('Clicker initialized.', 'success');
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initDiaphantium, { once: true });
} else {
	initDiaphantium();
}
