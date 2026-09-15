import resetCSS from './clicker/assets/css/diaphantium.reset.css?inline';
import variablesCSS from './clicker/assets/css/diaphantium.variables.css?inline';
import stylesCSS from './clicker/assets/css/diaphantium.styles.css?inline';

import Popup from './clicker/core/Popup.js';
import Clicker from './clicker/core/Clicker.js';

const style = document.createElement('style');
style.textContent = resetCSS + variablesCSS + stylesCSS;
document.head.append(style);

function initDiaphantium() {
	const popup = new Popup();
	const clicker = new Clicker(popup);
	window.clickerInstance = clicker;
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initDiaphantium);
} else {
	initDiaphantium();
}
