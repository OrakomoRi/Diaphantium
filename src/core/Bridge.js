export const Bridge = {
	_pending: new Map(),

	fetch(url, format = 'text', timeout = 30000) {
		return new Promise((resolve, reject) => {
			const id = this._uniqueUuid();
			this._pending.set(id, { resolve, reject });

			window.dispatchEvent(new CustomEvent('diaphantium:fetch', {
				detail: { id, url, format }
			}));

			setTimeout(() => {
				if (!this._pending.has(id)) return;
				this._pending.delete(id);
				reject(new Error(`Fetch timeout: ${url}`));
			}, timeout);
		});
	},

	getValue(key, defaultVal = '') {
		return new Promise((resolve) => {
			const id = this._uniqueUuid();
			this._pending.set(id, { resolve, reject: resolve });

			window.dispatchEvent(new CustomEvent('diaphantium:store:get', {
				detail: { id, key, default: defaultVal }
			}));
		});
	},

	setValue(key, value) {
		window.dispatchEvent(new CustomEvent('diaphantium:store:set', {
			detail: { key, value }
		}));
	},

	openTab(url) {
		window.dispatchEvent(new CustomEvent('diaphantium:open-tab', {
			detail: { url }
		}));
	},

	updateScript(hash) {
		window.dispatchEvent(new CustomEvent('diaphantium:update', {
			detail: { hash }
		}));
	},

	init() {
		window.addEventListener('diaphantium:fetch:response', (e) => {
			const { id, data, error } = e.detail;
			const pending = this._pending.get(id);
			if (!pending) return;
			this._pending.delete(id);
			error ? pending.reject(new Error(error)) : pending.resolve(data);
		});

		window.addEventListener('diaphantium:store:response', (e) => {
			const { id, value } = e.detail;
			const pending = this._pending.get(id);
			if (!pending) return;
			this._pending.delete(id);
			pending.resolve(value);
		});
	},

	_uniqueUuid() {
		let uuid;
		do {
			uuid = crypto.randomUUID();
		} while (this._pending.has(uuid));
		return uuid;
	}
};
