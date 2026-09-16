import { describe, expect, it } from 'vitest';
import { mixShape, surfaceTransform, switchPhases } from '@/clicker/ui/motion/themeMorph';
import { formatReleaseDate } from '@/clicker/ui/model/about';

describe('switchPhases', () => {
	it('starts on the old theme and ends on the new one', () => {
		expect(switchPhases(0)).toEqual({ outgoingContent: 1, morph: 0, incomingSurface: 0, outgoingSurface: 1, incomingContent: 0 });
		expect(switchPhases(1)).toEqual({ outgoingContent: 0, morph: 1, incomingSurface: 1, outgoingSurface: 0, incomingContent: 1 });
	});

	it('never shows the content of both themes at once and never leaves the panel without glass', () => {
		for (let step = 0; step <= 1000; step++) {
			const phases = switchPhases(step / 1000);
			expect(Math.min(phases.outgoingContent, phases.incomingContent)).toBe(0);
			expect(Math.max(phases.outgoingSurface, phases.incomingSurface)).toBeGreaterThan(0.99);
		}
	});

	it('changes the size only while both contents are hidden or nearly hidden', () => {
		for (let step = 0; step <= 1000; step++) {
			const phases = switchPhases(step / 1000);
			if (phases.morph > 0.01 && phases.morph < 0.99) expect(Math.max(phases.outgoingContent, phases.incomingContent)).toBeLessThan(0.2);
		}
	});
});

describe('surface geometry', () => {
	const from = { x: 0, y: 0, width: 448, height: 520, radius: 11 };
	const to = { x: 104, y: 0, width: 344, height: 460, radius: 26 };

	it('interpolates position, size and radius', () => {
		expect(mixShape(from, to, 0)).toEqual(from);
		expect(mixShape(from, to, 1)).toEqual(to);
		expect(mixShape(from, to, 0.5)).toEqual({ x: 52, y: 0, width: 396, height: 490, radius: 18.5 });
	});

	it('draws a surface at its own box without distortion and corrects the radius for the scale', () => {
		expect(surfaceTransform(to, to)).toEqual({ transform: 'translate3d(0px, 0px, 0) scale(1, 1)', borderRadius: '26px / 26px' });
		expect(surfaceTransform({ ...to, width: 688, height: 230 }, to)).toEqual({ transform: 'translate3d(0px, 0px, 0) scale(2, 0.5)', borderRadius: '13px / 52px' });
	});
});

describe('formatReleaseDate', () => {
	it('writes the date in the panel language', () => {
		expect(formatReleaseDate('2026-09-16', 'en')).toBe('September 16, 2026');
		expect(formatReleaseDate('2026-09-16', 'ru')).toMatch(/^16 сентября 2026/);
		expect(formatReleaseDate('2026-09-16', 'uk')).toMatch(/^16 вересня 2026/);
	});

	it('keeps an unreadable date as it is', () => {
		expect(formatReleaseDate('unknown', 'en')).toBe('unknown');
	});
});
