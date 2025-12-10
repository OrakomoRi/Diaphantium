import { on, throttle, debounce } from './utils.js';
import { setStorage } from './storage.js';

// Makes DOM elements draggable
export default class ElementMover {
	constructor(element, handle = null) {
		this.element = element;
		this.handle = handle || element;
		this.isDragging = false;
		this.startX = 0;
		this.startY = 0;
		this.offsetX = 0;
		this.offsetY = 0;

		// Throttled move for better performance
		this.handleMoveThrottled = throttle(this.handleMove.bind(this), 16); // ~60fps
		// Debounced save to reduce localStorage writes
		this.debouncedSave = debounce(this.savePosition.bind(this), 500);

		this.init();
	}

	init() {
		on(this.handle, 'mousedown', this.handleStart.bind(this));
		on(this.handle, 'touchstart', this.handleStart.bind(this));
	}

	handleStart(e) {
		// Ignore if clicking on interactive elements
		if (this.shouldIgnore(e.target)) {
			return;
		}

		const touch = e.touches ? e.touches[0] : e;
		const rect = this.element.getBoundingClientRect();

		this.offsetX = touch.clientX - rect.left;
		this.offsetY = touch.clientY - rect.top;
		this.isDragging = true;

		on(document, 'mousemove', this.handleMoveThrottled);
		on(document, 'touchmove', this.handleMoveThrottled);
		on(document, 'mouseup', this.handleEnd);
		on(document, 'touchend', this.handleEnd);

		e.preventDefault();
	}

	handleMove(e) {
		if (!this.isDragging) return;

		const touch = e.touches ? e.touches[0] : e;
		let x = touch.clientX - this.offsetX;
		let y = touch.clientY - this.offsetY;

		// Keep within viewport
		const maxX = window.innerWidth - this.element.offsetWidth;
		const maxY = window.innerHeight - this.element.offsetHeight;

		x = Math.max(0, Math.min(x, maxX));
		y = Math.max(0, Math.min(y, maxY));

		this.element.style.left = `${x}px`;
		this.element.style.top = `${y}px`;

		// Debounced save during drag
		this.debouncedSave();
	}

	handleEnd = () => {
		if (!this.isDragging) return;

		this.isDragging = false;
		document.removeEventListener('mousemove', this.handleMoveThrottled);
		document.removeEventListener('touchmove', this.handleMoveThrottled);
		document.removeEventListener('mouseup', this.handleEnd);
		document.removeEventListener('touchend', this.handleEnd);

		// Final save on drop
		this.savePosition();
	};

	savePosition() {
		const rect = this.element.getBoundingClientRect();
		setStorage('coordinates', {
			top: rect.top,
			left: rect.left
		});
	}

	shouldIgnore(target) {
		return (
			target.tagName === 'INPUT' ||
			target.tagName === 'BUTTON' ||
			target.tagName === 'SVG' ||
			target.tagName === 'path' ||
			target.closest('button') ||
			target.closest('label') ||
			target.closest('.supply') ||
			target.closest('.close') ||
			target.closest('.navigation .item') ||
			target.closest('.refresh_hotkey') ||
			target.closest('.checkbox')
		);
	}
}
