import './clicker/assets/css/diaphantium.reset.css';
import './clicker/assets/css/diaphantium.variables.css';
import './clicker/assets/css/diaphantium.styles.css';

import Popup from './clicker/core/Popup.js';
import Clicker from './clicker/core/Clicker.js';

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
