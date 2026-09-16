import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EDGE_MARGIN, anchorFromPlacement, clampPlacement, placementFromAnchor, readAnchor, type Anchor } from '@/clicker/core/position';

const FALLBACK: Anchor = { ax: 'left', x: 100, ay: 'top', y: 100 };
const PANEL = { width: 300, height: 200 };

function setViewport(width: number, height: number): void {
	const root = document.documentElement;
	Object.defineProperty(root, 'clientWidth', { configurable: true, get: () => width });
	Object.defineProperty(root, 'clientHeight', { configurable: true, get: () => height });
}

describe('panel position', () => {
	beforeEach(() => {
		setViewport(1000, 800);
	});

	afterEach(() => {
		const root = document.documentElement as unknown as Record<string, unknown>;
		delete root.clientWidth;
		delete root.clientHeight;
	});

	describe('clampPlacement', () => {
		it('keeps a placement that already fits', () => {
			expect(clampPlacement({ left: 50, top: 60 }, PANEL)).toEqual({ left: 50, top: 60 });
		});

		it('keeps the edge margin on every side', () => {
			expect(clampPlacement({ left: -40, top: 3 }, PANEL)).toEqual({ left: EDGE_MARGIN, top: EDGE_MARGIN });
			expect(clampPlacement({ left: 5000, top: 5000 }, PANEL)).toEqual({ left: 1000 - 300 - EDGE_MARGIN, top: 800 - 200 - EDGE_MARGIN });
		});

		it('pins a panel larger than the window to the top-left margin', () => {
			setViewport(200, 100);
			expect(clampPlacement({ left: 50, top: 50 }, PANEL)).toEqual({ left: EDGE_MARGIN, top: EDGE_MARGIN });
		});
	});

	describe('anchors', () => {
		it('anchors to the nearest horizontal and vertical edges', () => {
			expect(anchorFromPlacement({ left: 40, top: 30 }, PANEL)).toEqual({ ax: 'left', x: 40, ay: 'top', y: 30 });
			expect(anchorFromPlacement({ left: 680, top: 580 }, PANEL)).toEqual({ ax: 'right', x: 20, ay: 'bottom', y: 20 });
		});

		it('returns to the same placement in the same window', () => {
			for (const placement of [{ left: 40, top: 30 }, { left: 680, top: 580 }, { left: 350, top: 300 }]) {
				expect(placementFromAnchor(anchorFromPlacement(placement, PANEL), PANEL)).toEqual(placement);
			}
		});

		it('keeps the distance to a right and bottom anchor when the window changes', () => {
			const anchor = anchorFromPlacement({ left: 680, top: 580 }, PANEL);
			setViewport(700, 500);
			expect(placementFromAnchor(anchor, PANEL)).toEqual({ left: 380, top: 280 });
		});

		it('clamps a placement computed from an anchor that no longer fits', () => {
			setViewport(400, 300);
			expect(placementFromAnchor({ ax: 'left', x: 390, ay: 'top', y: 290 }, PANEL)).toEqual({ left: 400 - 300 - EDGE_MARGIN, top: 300 - 200 - EDGE_MARGIN });
		});
	});

	describe('readAnchor', () => {
		it('reads a stored anchor', () => {
			expect(readAnchor({ top: 1, left: 2, anchor: { ax: 'right', x: 12, ay: 'bottom', y: 34 } }, FALLBACK)).toEqual({ ax: 'right', x: 12, ay: 'bottom', y: 34 });
		});

		it('treats coordinates without an anchor as a top-left anchor', () => {
			expect(readAnchor({ top: 120, left: 200 }, FALLBACK)).toEqual({ ax: 'left', x: 200, ay: 'top', y: 120 });
		});

		it('rounds and bounds offsets, and replaces what is not a number', () => {
			expect(readAnchor({ top: 12.6, left: -50 }, FALLBACK)).toEqual({ ax: 'left', x: 0, ay: 'top', y: 13 });
			expect(readAnchor({ top: '5', left: Number.NaN }, FALLBACK)).toEqual({ ax: 'left', x: 100, ay: 'top', y: 100 });
			expect(readAnchor({ anchor: { ax: 'middle', x: 1e9, ay: null, y: Infinity } }, FALLBACK)).toEqual({ ax: 'left', x: 100000, ay: 'top', y: 100 });
		});

		it.each([null, undefined, 'x', 42])('falls back for %s', saved => {
			expect(readAnchor(saved, FALLBACK)).toBe(FALLBACK);
		});
	});
});
