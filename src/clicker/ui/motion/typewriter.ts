export interface TypewriterFrame {
	count: number;
	busy: boolean;
}

export interface TypewriterOptions {
	text: () => string;
	visible: boolean;
	render: (frame: TypewriterFrame) => void;
	instant?: () => boolean;
	random?: () => number;
	schedule?: (callback: () => void, delay: number) => unknown;
	cancel?: (handle: unknown) => void;
}

export interface Typewriter {
	show(visible: boolean): void;
	refresh(): void;
	destroy(): void;
}

export const TYPING = {
	keyMin: 45,
	keySpread: 85,
	afterSpace: 70,
	hesitationChance: 0.12,
	hesitationMin: 120,
	hesitationSpread: 160,
	repeatDelay: 170,
	repeatInterval: 24,
} as const;

export function typingDelay(previous: string | undefined, random: () => number): number {
	let delay = TYPING.keyMin + random() * TYPING.keySpread;
	if (previous === ' ') delay += TYPING.afterSpace * (0.5 + random());
	if (random() < TYPING.hesitationChance) delay += TYPING.hesitationMin + random() * TYPING.hesitationSpread;
	return Math.round(delay);
}

export function createTypewriter(options: TypewriterOptions): Typewriter {
	const random = options.random ?? Math.random;
	const schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
	const cancel = options.cancel ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));

	let visible = options.visible;
	let count = visible ? options.text().length : 0;
	let handle: unknown = null;
	let held = false;

	function stop(): void {
		if (handle !== null) cancel(handle);
		handle = null;
	}

	function render(): void {
		options.render({ count, busy: handle !== null });
	}

	function step(): void {
		handle = null;
		const text = options.text();
		const goal = visible ? text.length : 0;

		if (count === goal) {
			held = false;
			render();
			return;
		}

		if (count < goal) {
			count++;
			held = false;
			handle = schedule(step, typingDelay(text[count - 1], random));
		} else {
			count--;
			handle = schedule(step, held ? TYPING.repeatInterval : TYPING.repeatDelay);
			held = true;
		}
		render();
	}

	return {
		show(next) {
			if (next === visible && handle !== null) return;
			visible = next;
			stop();
			held = false;
			if (options.instant?.()) {
				count = visible ? options.text().length : 0;
				render();
				return;
			}
			step();
		},
		refresh() {
			const length = options.text().length;
			if (handle === null) count = visible ? length : 0;
			else count = Math.min(count, length);
			render();
		},
		destroy: stop,
	};
}
