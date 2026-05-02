export const $ = (selector, context = document) => context.querySelector(selector);

export const $$ = (selector, context = document) => context.querySelectorAll(selector);

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

export function on(el, event, handler, options) {
	if (el) el.addEventListener(event, handler, options);
}

export function off(el, event, handler) {
	if (el) el.removeEventListener(event, handler);
}

export function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

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

