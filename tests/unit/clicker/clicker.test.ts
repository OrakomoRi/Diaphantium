import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function createClicker(config: Record<string, unknown> = {}) {
	localStorage.setItem('Diaphantium.config', JSON.stringify(config));
	vi.resetModules();
	const { default: Clicker } = await import('@/clicker/core/Clicker');
	return new Clicker();
}

function recordKeydowns(): string[] {
	const keys: string[] = [];
	document.addEventListener('keydown', event => keys.push(event.code));
	return keys;
}

describe('Clicker', () => {
	let frameTime = 0;
	let frames: Array<(time: number) => void> = [];

	function advanceFrames(count: number, interval: number): void {
		for (let index = 0; index < count; index++) {
			frameTime += interval;
			const due = frames;
			frames = [];
			due.forEach(callback => callback(frameTime));
		}
	}

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		frameTime = 0;
		frames = [];
		vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
			frames.push(callback);
			return frames.length;
		});
		vi.stubGlobal('cancelAnimationFrame', () => {
			frames = [];
		});
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('runs one mine loop after being switched off and on within the delay', async () => {
		const clicker = await createClicker({ mineDelay: 100 });
		const keys = recordKeydowns();

		clicker.toggle('mines');
		clicker.toggle('mines');
		clicker.toggle('mines');
		expect(keys).toEqual(['Digit5', 'Digit5']);

		vi.advanceTimersByTime(100);
		expect(keys).toHaveLength(3);
		vi.advanceTimersByTime(300);
		expect(keys).toHaveLength(6);

		clicker.stop('mines');
		vi.advanceTimersByTime(1000);
		expect(keys).toHaveLength(6);
	});

	it('ignores a start of a running feature', async () => {
		const clicker = await createClicker({ mineDelay: 100 });
		const keys = recordKeydowns();

		clicker.start('mines');
		clicker.start('mines');
		vi.advanceTimersByTime(250);
		expect(keys).toHaveLength(3);
		clicker.stop('mines');
	});

	it('presses the chosen supplies at most about 90 times a second, whatever the refresh rate', async () => {
		const clicker = await createClicker({ clickValues: [{ key: '2', value: 'on' }, { key: '3', value: 'off' }] });
		const keys = recordKeydowns();

		clicker.start('supplies');
		expect(keys).toEqual(['Digit2']);

		advanceFrames(240, 1000 / 240);
		expect(keys.length).toBeGreaterThanOrEqual(60);
		expect(keys.length).toBeLessThanOrEqual(91);

		keys.length = 0;
		advanceFrames(60, 1000 / 60);
		expect(keys).toHaveLength(60);
		clicker.stop('supplies');
	});

	it('follows a changed supply choice', async () => {
		const clicker = await createClicker({ clickValues: [{ key: '1', value: 'on' }] });
		const { setStorage } = await import('@/clicker/storage/storage');
		const keys = recordKeydowns();

		clicker.start('supplies');
		setStorage('clickValues', [{ key: '1', value: 'off' }, { key: '4', value: 'on' }]);
		keys.length = 0;
		advanceFrames(1, 1000 / 60);
		expect(keys).toEqual(['Digit4']);
		clicker.stop('supplies');
	});

	it('resumes the features that were on and stores every change', async () => {
		const clicker = await createClicker({ antiAfkState: true, autoDeleteState: false });
		expect(clicker.features.antiAfk.enabled).toBe(true);

		clicker.toggle('antiAfk');
		clicker.toggle('autoDelete');
		vi.advanceTimersByTime(400);
		expect(JSON.parse(localStorage.getItem('Diaphantium.config') ?? '{}')).toMatchObject({ antiAfkState: false, autoDeleteState: true });
		clicker.stop('autoDelete');
	});
});
