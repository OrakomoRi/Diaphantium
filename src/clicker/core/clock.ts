import { logger } from './logger';
import ClockWorker from './clock.worker?worker&inline';

export const TICK_INTERVAL_MS = 11;

interface Backend {
	tick(listener: () => void): () => void;
	after(ms: number, callback: () => void): () => void;
}

function createMainThreadBackend(): Backend {
	const listeners = new Set<() => void>();
	let timer: ReturnType<typeof setTimeout> | null = null;

	function step(): void {
		for (const listener of listeners) listener();
		timer = setTimeout(step, TICK_INTERVAL_MS);
	}

	return {
		tick(listener) {
			if (listeners.size === 0) timer = setTimeout(step, TICK_INTERVAL_MS);
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0 && timer !== null) {
					clearTimeout(timer);
					timer = null;
				}
			};
		},
		after(ms, callback) {
			const handle = setTimeout(callback, ms);
			return () => clearTimeout(handle);
		},
	};
}

function createWorkerBackend(worker: Worker): Backend {
	const listeners = new Set<() => void>();
	const pending = new Map<number, () => void>();
	let nextId = 0;

	worker.onmessage = event => {
		const msg = event.data as { type: string; id?: number };
		if (msg.type === 'tick') {
			for (const listener of listeners) listener();
		} else if (msg.type === 'after' && msg.id !== undefined) {
			const callback = pending.get(msg.id);
			pending.delete(msg.id);
			callback?.();
		}
	};

	return {
		tick(listener) {
			if (listeners.size === 0) worker.postMessage({ type: 'tick-start', intervalMs: TICK_INTERVAL_MS });
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0) worker.postMessage({ type: 'tick-stop' });
			};
		},
		after(ms, callback) {
			const id = nextId++;
			pending.set(id, callback);
			worker.postMessage({ type: 'after', id, ms });
			return () => {
				pending.delete(id);
				worker.postMessage({ type: 'cancel', id });
			};
		},
	};
}

let backend: Backend | null = null;

function getBackend(): Backend {
	if (backend) return backend;
	try {
		const worker = new ClockWorker();
		logger.log('Clock: running in a worker, immune to background/focus throttling.', 'info');
		backend = createWorkerBackend(worker);
	} catch (e) {
		logger.log(`Clock: worker unavailable, falling back to the main thread - ${e}`, 'warn');
		backend = createMainThreadBackend();
	}
	return backend;
}

export function onTick(listener: () => void): () => void {
	return getBackend().tick(listener);
}

export function afterDelay(ms: number, callback: () => void): () => void {
	return getBackend().after(ms, callback);
}
