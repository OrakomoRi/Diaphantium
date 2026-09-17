export {};

interface TickStartMessage {
	type: 'tick-start';
	intervalMs: number;
}

interface TickStopMessage {
	type: 'tick-stop';
}

interface AfterMessage {
	type: 'after';
	id: number;
	ms: number;
}

interface CancelMessage {
	type: 'cancel';
	id: number;
}

type InboundMessage = TickStartMessage | TickStopMessage | AfterMessage | CancelMessage;

let tickTimer: ReturnType<typeof setInterval> | null = null;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

onmessage = (event: MessageEvent<InboundMessage>) => {
	const msg = event.data;
	switch (msg.type) {
		case 'tick-start':
			if (tickTimer === null) tickTimer = setInterval(() => postMessage({ type: 'tick' }), msg.intervalMs);
			break;
		case 'tick-stop':
			if (tickTimer !== null) clearInterval(tickTimer);
			tickTimer = null;
			break;
		case 'after':
			timers.set(
				msg.id,
				setTimeout(() => {
					timers.delete(msg.id);
					postMessage({ type: 'after', id: msg.id });
				}, msg.ms),
			);
			break;
		case 'cancel': {
			const handle = timers.get(msg.id);
			if (handle !== undefined) clearTimeout(handle);
			timers.delete(msg.id);
			break;
		}
	}
};
