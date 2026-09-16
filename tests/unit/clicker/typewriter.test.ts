import { describe, expect, it } from 'vitest';
import { createTypewriter, TYPING, type TypewriterFrame } from '@/clicker/ui/motion/typewriter';

function harness(visible: boolean, text = 'Hi you') {
	const queue: Array<{ callback: () => void; delay: number }> = [];
	const frames: TypewriterFrame[] = [];
	const typewriter = createTypewriter({
		text: () => text,
		visible,
		random: () => 0.5,
		render: frame => frames.push(frame),
		schedule: (callback, delay) => {
			const entry = { callback, delay };
			queue.push(entry);
			return entry;
		},
		cancel: handle => {
			const index = queue.indexOf(handle as (typeof queue)[number]);
			if (index >= 0) queue.splice(index, 1);
		},
	});
	const tick = () => {
		const next = queue.shift();
		next?.callback();
		return next?.delay;
	};
	return { typewriter, frames, queue, tick, last: () => frames.at(-1) };
}

describe('createTypewriter', () => {
	it('types one character per step until the text is complete, then goes idle', () => {
		const { typewriter, tick, last, queue } = harness(false);
		typewriter.show(true);
		expect(last()).toEqual({ count: 1, busy: true });
		for (let i = 0; i < 10 && queue.length; i++) tick();
		expect(last()).toEqual({ count: 6, busy: false });
		expect(queue).toHaveLength(0);
	});

	it('pauses longer after a space than after a letter', () => {
		const { typewriter, tick } = harness(false, 'a b');
		typewriter.show(true);
		const afterLetter = tick();
		const afterSpace = tick();
		expect(afterSpace).toBeGreaterThan(afterLetter ?? 0);
	});

	it('erases like a held key: one repeat delay, then the fast repeat interval', () => {
		const { typewriter, queue, tick, last } = harness(true);
		typewriter.show(false);
		expect(last()?.count).toBe(5);
		expect(queue[0]?.delay).toBe(TYPING.repeatDelay);
		tick();
		expect(queue[0]?.delay).toBe(TYPING.repeatInterval);
	});

	it('reverses from the current length when toggled mid-way', () => {
		const { typewriter, tick, last } = harness(false);
		typewriter.show(true);
		tick();
		tick();
		expect(last()?.count).toBe(3);
		typewriter.show(false);
		expect(last()?.count).toBe(2);
		typewriter.show(true);
		expect(last()?.count).toBe(3);
	});
});
