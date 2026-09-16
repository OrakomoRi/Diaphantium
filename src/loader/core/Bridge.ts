export type FetchFormat = 'text' | 'json' | 'base64';

interface Pending {
	resolve: (value: unknown) => void;
	reject: (reason: unknown) => void;
}

interface FetchResponse {
	id: string;
	data?: unknown;
	error?: string;
}

interface StoreResponse {
	id: string;
	value: unknown;
}

const pending = new Map<string, Pending>();

function uniqueId(): string {
	let id: string;
	do {
		id = crypto.randomUUID();
	} while (pending.has(id));
	return id;
}

function dispatch(type: string, detail: object): void {
	window.dispatchEvent(new CustomEvent(type, { detail }));
}

export const Bridge = {
	fetch<T = string>(url: string, format: FetchFormat = 'text', timeout = 30000): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const id = uniqueId();
			pending.set(id, { resolve: resolve as (value: unknown) => void, reject });

			dispatch('diaphantium:fetch', { id, url, format });

			setTimeout(() => {
				if (!pending.has(id)) return;
				pending.delete(id);
				reject(new Error(`Fetch timeout: ${url}`));
			}, timeout);
		});
	},

	getValue<T>(key: string, defaultValue: T): Promise<T> {
		return new Promise<T>(resolve => {
			const id = uniqueId();
			pending.set(id, { resolve: resolve as (value: unknown) => void, reject: resolve as (value: unknown) => void });

			dispatch('diaphantium:store:get', { id, key, default: defaultValue });
		});
	},

	setValue(key: string, value: unknown): void {
		dispatch('diaphantium:store:set', { key, value });
	},

	openTab(url: string): void {
		dispatch('diaphantium:open-tab', { url });
	},

	updateScript(hash: string): void {
		dispatch('diaphantium:update', { hash });
	},

	init(): void {
		window.addEventListener('diaphantium:fetch:response', event => {
			const { id, data, error } = (event as CustomEvent<FetchResponse>).detail;
			const request = pending.get(id);
			if (!request) return;
			pending.delete(id);
			if (error) request.reject(new Error(error));
			else request.resolve(data);
		});

		window.addEventListener('diaphantium:store:response', event => {
			const { id, value } = (event as CustomEvent<StoreResponse>).detail;
			const request = pending.get(id);
			if (!request) return;
			pending.delete(id);
			request.resolve(value);
		});
	},
};
