if (typeof window.BreeziumSelect === 'undefined') {
	/**
	 * Lightweight custom select with zero dependencies.
	 *
	 * @param {Array<{name:string,value?:string,code?:string,disabled?:boolean}>} options
	 * @param {(value:string)=>void} callback
	 * @param {{name:string,value?:string,code?:string}|string|null} defaultOption
	 */
	class BreeziumSelect {
		constructor(options, callback, defaultOption = null) {
			// Root container
			this.container = document.createElement('div');
			this.container.classList.add('breezium-select');

			// Normalize options
			this.options = this._normalizeOptions(options);
			this.callback = typeof callback === 'function' ? callback : () => { };

			// Selected header and dropdown nodes
			this.selected = null;
			this.optionsContainer = null;

			// Direction: 'down' | 'up'
			this._dropDirection = 'down';

			// Bound listeners (for add/remove symmetry)
			this._onDocClick = (e) => {
				// Close only if click is outside
				if (!this.container.contains(e.target)) this.close();
			};
			this._onRecalc = () => { if (this.isOpen()) this._applyDirection(); };

			// Resolve default option
			const resolvedDefault =
				(defaultOption && typeof defaultOption === 'object')
					? this._optByAny(defaultOption.value ?? defaultOption.code)
					: (typeof defaultOption === 'string'
						? this._optByAny(defaultOption)
						: null) || this.options[0] || { name: 'Select Option', value: '' };

			this.defaultOption = resolvedDefault;

			this._init();
		}

		/* ------------------ Private utils ------------------ */

		/**
		 * Normalize incoming options to canonical { name, value, disabled }.
		 * Supports legacy { code } field by mapping it to value.
		 */
		_normalizeOptions(options) {
			const arr = Array.isArray(options) ? options : [];
			return arr.map(o => ({
				name: String(o?.name ?? ''),
				value: String(o?.value ?? o?.code ?? ''),
				disabled: !!o?.disabled
			}));
		}

		/**
		 * Find option by either value or legacy code.
		 * @param {string} anyValue
		 */
		_optByAny(anyValue) {
			const v = anyValue != null ? String(anyValue) : '';
			return this.options.find(o => o.value === v) || null;
		}

		/* ------------------ Lifecycle & rendering ------------------ */

		_init() {
			// Header (current selection)
			this.selected = document.createElement('div');
			this.selected.classList.add('breezium-selected');
			this.selected.textContent = this.defaultOption.name;
			this.selected.dataset.value = this.defaultOption.value;
			this.selected.setAttribute('role', 'button');
			this.selected.setAttribute('tabindex', '0');
			this.selected.setAttribute('aria-haspopup', 'listbox');
			this.selected.setAttribute('aria-expanded', 'false');

			// Dropdown container
			this.optionsContainer = document.createElement('div');
			this.optionsContainer.classList.add('breezium-options');
			this.optionsContainer.setAttribute('role', 'listbox');

			this._renderOptions();

			// Toggle open/close
			this.selected.addEventListener('click', (e) => {
				e.stopPropagation(); // prevent immediate close by outside handler
				this.toggle();
			});
			this.selected.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.toggle(); }
				if (e.key === 'Escape') this.close();
			});
		}

		_renderOptions() {
			this.optionsContainer.innerHTML = '';
			const current = this.getValue();
			for (const option of this.options) {
				const el = document.createElement('div');
				el.classList.add('breezium-option');
				el.setAttribute('role', 'option');
				el.textContent = option.name;
				el.dataset.value = option.value;
				if (option.disabled) el.classList.add('is-disabled');
				if (current === option.value) el.classList.add('is-selected');

				el.addEventListener('click', (e) => {
					e.stopPropagation();
					if (option.disabled) return;
					this._selectInternal(option, true);
				});

				this.optionsContainer.appendChild(el);
			}
		}

		/* ---------- direction & open/close ---------- */

		/**
		 * Decide opening direction based on available viewport space.
		 * Try down first; if there's not enough space and more space above — open up.
		 */
		_applyDirection() {
			// Compute available space above/below; decide drop-up if bottom space is less
			const rect = this.container.getBoundingClientRect();
			const spaceBelow = Math.max(0, window.innerHeight - rect.bottom);
			const spaceAbove = Math.max(0, rect.top);

			const shouldOpenUp = spaceAbove > spaceBelow;
			this._dropDirection = shouldOpenUp ? 'up' : 'down';

			this.container.classList.toggle('drop-up', this._dropDirection === 'up');
			this.container.classList.toggle('drop-down', this._dropDirection === 'down');
		}

		open() {
			this._applyDirection();
			this.container.classList.add('show');
			this.selected.setAttribute('aria-expanded', 'true');

			// Attach global listeners lazily to avoid instant-close race
			document.addEventListener('click', this._onDocClick, { capture: true });
			window.addEventListener('resize', this._onRecalc, { passive: true });
			window.addEventListener('scroll', this._onRecalc, { passive: true });
		}

		close() {
			if (!this.isOpen()) return;
			this.container.classList.remove('show');
			this.selected.setAttribute('aria-expanded', 'false');

			// Detach global listeners to reduce side effects
			document.removeEventListener('click', this._onDocClick, { capture: true });
			window.removeEventListener('resize', this._onRecalc, { passive: true });
			window.removeEventListener('scroll', this._onRecalc, { passive: true });
		}

		toggle() { this.isOpen() ? this.close() : this.open(); }
		isOpen() { return this.container.classList.contains('show'); }

		/* ------------------ Public API ------------------ */

		/**
		 * Update options in place. Keeps current value by default.
		 * @param {Array<{name:string,value?:string,code?:string,disabled?:boolean}>} options
		 * @param {string|null} keepValue null -> keep current; string -> force that value
		 */
		updateOptions(options, keepValue = null) {
			this.options = this._normalizeOptions(options);
			const target = keepValue === null ? this.getValue() : String(keepValue);
			this._renderOptions();

			// Restore selection if possible; fallback to first option
			const found = this._optByAny(target) || this.options[0] || { name: 'Select Option', value: '' };
			this.selected.textContent = found.name;
			this.selected.dataset.value = found.value;
		}

		/**
		 * Programmatically set value (triggers callback by default).
		 * @param {string} value
		 * @param {{trigger?:boolean}} opts
		 */
		setValue(value, { trigger = true } = {}) {
			const opt = this._optByAny(value);
			if (!opt || opt.disabled) return;

			const prev = this.getValue();
			this.selected.textContent = opt.name;
			this.selected.dataset.value = opt.value;

			// Refresh option highlight
			this.optionsContainer.querySelectorAll('.breezium-option').forEach(el => {
				el.classList.toggle('is-selected', el.dataset.value === opt.value);
			});

			if (trigger && prev !== opt.value) this.callback(opt.value);
		}

		/** @returns {string} current value */
		getValue() { return this.selected?.dataset?.value ?? ''; }

		/** @returns {string} current label */
		getLabel() { return this.selected?.textContent ?? ''; }

		/**
		 * Select option from list (usually by click).
		 * Internal to ensure unified callback/closing.
		 */
		_selectInternal(option, trigger = true) {
			this.setValue(option.value, { trigger });
			this.close();
		}

		/**
		 * Mount into DOM.
		 * @param {HTMLElement} parent
		 * @param {HTMLElement|null} sibling  Insert before/after this node if provided
		 * @param {boolean} insertAfter       true -> insert after sibling; false -> before
		 */
		render(parent, sibling = null, insertAfter = false) {
			this.container.appendChild(this.selected);
			this.container.appendChild(this.optionsContainer);

			if (sibling) {
				if (insertAfter && sibling.nextSibling) {
					parent.insertBefore(this.container, sibling.nextSibling);
				} else {
					parent.insertBefore(this.container, sibling);
				}
			} else {
				parent.appendChild(this.container);
			}
		}

		/** Clean up listeners and remove DOM. */
		destroy() {
				this.close(); // removes listeners if open
			this.container.remove();
		}
	}

	window.BreeziumSelect = BreeziumSelect;
}