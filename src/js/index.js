// Import components
import Popup from './Popup.js';
import Clicker from './Clicker.js';

// Import styles
import '../css/diaphantium.reset.css';
import '../css/diaphantium.variables.css';
import '../css/diaphantium.styles.css';

// Initialize function
function initDiaphantium() {
	const popup = new Popup();
	const clicker = new Clicker(popup);
	
	console.log('Diaphantium initialized successfully!');
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
	// DOM is still loading, wait for DOMContentLoaded
	document.addEventListener('DOMContentLoaded', initDiaphantium);
} else {
	// DOM is already loaded, initialize immediately
	initDiaphantium();
}
