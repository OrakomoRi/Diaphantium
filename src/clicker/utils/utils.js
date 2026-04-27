// Get single element from DOM
export const $ = (selector, context = document) => context.querySelector(selector);

// Get all matching elements
export const $$ = (selector, context = document) => context.querySelectorAll(selector);

// Create DOM element with attributes
export function createElement(tag, attrs = {}) {
	const el = document.createElement(tag);
	Object.entries(attrs).forEach(([key, value]) => {
		if (key === 'className') el.className = value;
		else if (key === 'html') el.innerHTML = value;
		else if (key === 'text') el.textContent = value;
		else el.setAttribute(key, value);
	});
	return el;
}

// Add event listener to element
export function on(el, event, handler, options) {
	if (el) el.addEventListener(event, handler, options);
}

// Remove event listener from element
export function off(el, event, handler) {
	if (el) el.removeEventListener(event, handler);
}

// Debounce function - prevents excessive function calls
export function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

// Throttle function - limits function execution rate
export function throttle(func, limit) {
	let inThrottle;
	return function executedFunction(...args) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => inThrottle = false, limit);
		}
	};
}

