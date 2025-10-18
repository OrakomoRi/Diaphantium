import { createElement, on } from './utils.js';
import { getStorage, setStorage } from './storage.js';
import ElementMover from './ElementMover.js';

export default class MobileIcons {
  constructor(popup, clicker) {
    this.popup = popup;
    this.clicker = clicker;
    this.icons = [];
    
    this.init();
  }

  init() {
    if (this.isMobile()) {
      this.create();
    }

    on(window, 'resize', () => {
      if (this.isMobile()) {
        this.create();
      } else {
        this.remove();
      }
    });
  }

  isMobile() {
    if ('maxTouchPoints' in navigator) {
      return navigator.maxTouchPoints > 0;
    }
    if ('msMaxTouchPoints' in navigator) {
      return navigator.msMaxTouchPoints > 0;
    }
    const mQ = matchMedia?.('(pointer:coarse)');
    if (mQ?.media === '(pointer:coarse)') {
      return !!mQ.matches;
    }
    if ('orientation' in window) {
      return true;
    }
    const UA = navigator.userAgent;
    return /\b(BlackBerry|webOS|iPhone|IEMobile|Android|Windows Phone|iPad|iPod)\b/i.test(UA);
  }

  create() {
    if (document.querySelector('.diaphantium_mobile.icon[author="OrakomoRi"]')) {
      return;
    }

    // Add styles
    const style = createElement('style', {
      text: `.diaphantium_mobile.icon[author="OrakomoRi"] {
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: 777;
      }
      .diaphantium_mobile.icon.main[author="OrakomoRi"] {
        width: 3em;
        height: 3em;
      }
      .diaphantium_mobile.icon.supplies[author="OrakomoRi"],
      .diaphantium_mobile.icon.mines[author="OrakomoRi"] {
        width: 2.5em;
        height: 2.5em;
        fill: rgb(100, 100, 100);
      }
      .diaphantium_mobile.icon.supplies.active[author="OrakomoRi"] {
        fill: rgb(255, 51, 51);
      }
      .diaphantium_mobile.icon.mines.active[author="OrakomoRi"] {
        fill: rgb(54, 178, 74);
      }`
    });
    document.head.appendChild(style);

    // Create icons
    this.createIcon('main', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63z" stroke="#AFAFAF" stroke-linecap="round" stroke-linejoin="round" stroke-width="64"/></svg>`);
    this.createIcon('supplies', `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 1.33333L0 26L20 12L6 32L30.6667 28L20 24L32 0L8 12L4 1.33333Z"/></svg>`);
    this.createIcon('mines', `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 21.0098V10.9902L10.9902 4H21.0098L28 10.9902V21.0098L21.0098 28H10.9902L4 21.0098ZM8.74755 0.585786C9.12262 0.210713 9.63133 0 10.1618 0H21.8382C22.3687 0 22.8774 0.210714 23.2525 0.585787L31.4142 8.74755C31.7893 9.12262 32 9.63133 32 10.1618V21.8382C32 22.3687 31.7893 22.8774 31.4142 23.2525L23.2525 31.4142C22.8774 31.7893 22.3687 32 21.8382 32H10.1618C9.63133 32 9.12262 31.7893 8.74755 31.4142L0.585786 23.2525C0.210713 22.8774 0 22.3687 0 21.8382V10.1618C0 9.63133 0.210714 9.12262 0.585786 8.74755L8.74755 0.585786ZM16 23C19.866 23 23 19.866 23 16C23 12.134 19.866 9 16 9C12.134 9 9 12.134 9 16C9 19.866 12.134 23 16 23Z"/></svg>`);
  }

  createIcon(type, svg) {
    const icon = createElement('div', {
      className: `diaphantium_mobile icon ${type}`,
      html: svg
    });
    icon.setAttribute('author', 'OrakomoRi');
    document.body.appendChild(icon);

    // Position
    const saved = getStorage('Diaphantium.mobile');
    if (saved?.[type]?.coords) {
      icon.style.top = `${saved[type].coords.top}px`;
      icon.style.left = `${saved[type].coords.left}px`;
    } else {
      icon.style.top = '1em';
      icon.style.left = '1em';
    }

    // Make draggable
    new ElementMover(icon);

    // Click handler
    if (type === 'supplies' || type === 'mines') {
      on(icon, 'click', () => {
        icon.classList.toggle('active');
        if (type === 'supplies') {
          this.clicker.toggleSupplies();
        } else {
          this.clicker.toggleMines();
        }
      });
    }

    this.icons.push({ type, element: icon });
  }

  remove() {
    const positions = {};
    this.icons.forEach(({ type, element }) => {
      positions[type] = {
        icon: type,
        coords: {
          top: parseFloat(element.style.top),
          left: parseFloat(element.style.left)
        }
      };
      element.remove();
    });
    
    setStorage('Diaphantium.mobile', positions);
    this.icons = [];

    document.querySelectorAll('style').forEach(style => {
      if (style.textContent.includes('diaphantium_mobile')) {
        style.remove();
      }
    });
  }
}
