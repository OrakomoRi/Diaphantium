// Import components
import Popup from './Popup.js';
import Clicker from './Clicker.js';

// Import styles
import '../css/diaphantium.reset.css';
import '../css/diaphantium.variables.css';
import '../css/diaphantium.styles.css';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	const popup = new Popup();
	const clicker = new Clicker(popup);
	// Mobile support removed

	console.log('🎮 Diaphantium initialized successfully!');
});
