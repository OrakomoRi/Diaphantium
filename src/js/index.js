// Import components
import Popup from './Popup.js';
import Clicker from './Clicker.js';
import MobileIcons from './MobileIcons.js';

// Import styles
import '../css/diaphantium.reset.css';
import '../css/diaphantium.variables.css';
import '../css/diaphantium.styles.css';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const popup = new Popup();
  const clicker = new Clicker(popup);
  const mobileIcons = new MobileIcons(popup, clicker);
  
  console.log('🎮 Diaphantium initialized successfully!');
});
