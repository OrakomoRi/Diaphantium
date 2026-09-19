import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EDGE_MARGIN, anchorFromPlacement, clampPlacement, fitScale, panelTransform, placementFromAnchor, readAnchor, scaleSize, type Anchor } from '@/clicker/core/position';

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

	describe('interface scale', () => {
		it('scales a size by the factor', () => {
			expect(scaleSize(PANEL, 1)).toEqual(PANEL);
			expect(scaleSize(PANEL, 2)).toEqual({ width: 600, height: 400 });
			expect(scaleSize(PANEL, 0.8)).toEqual({ width: 240, height: 160 });
		});

		it('writes the placement and the scale into one transform', () => {
			expect(panelTransform({ left: 40.4, top: 30.6 }, 1.25)).toBe('translate3d(40px, 31px, 0) scale(1.25)');
			expect(panelTransform({ left: 0, top: 0 }, 1)).toBe('translate3d(0px, 0px, 0) scale(1)');
		});

		it('keeps the edge distances of an anchor while the panel grows', () => {
			const left = { ax: 'left', x: 40, ay: 'top', y: 30 } as const;
			const right = { ax: 'right', x: 20, ay: 'bottom', y: 20 } as const;

			for (const factor of [0.8, 1, 1.25, 1.5, 2]) {
				const size = scaleSize(PANEL, factor);
				expect(placementFromAnchor(left, size)).toEqual({ left: 40, top: 30 });

				const placed = placementFromAnchor(right, size);
				expect(placed.left + size.width).toBeCloseTo(1000 - 20);
				expect(placed.top + size.height).toBeCloseTo(800 - 20);
			}
		});

		it('pushes a panel that grew past an edge back inside the margin', () => {
			const size = scaleSize(PANEL, 2);
			expect(placementFromAnchor({ ax: 'left', x: 700, ay: 'top', y: 500 }, size)).toEqual({ left: 1000 - 600 - EDGE_MARGIN, top: 800 - 400 - EDGE_MARGIN });
		});

		it('stores the same anchor for a scaled panel as for the placement it is dragged to', () => {
			const size = scaleSize(PANEL, 1.5);
			const anchor = anchorFromPlacement({ left: 500, top: 350 }, size);
			expect(anchor).toEqual({ ax: 'right', x: 50, ay: 'bottom', y: 150 });
			expect(placementFromAnchor(anchor, size)).toEqual({ left: 500, top: 350 });
		});

		describe('fitScale', () => {
			const viewport = { width: 1000, height: 800 };

			it('keeps the wanted scale while the panel fits with its margins', () => {
				expect(fitScale({ width: 300, height: 200 }, viewport, 2)).toBe(2);
				expect(fitScale({ width: 484, height: 384 }, viewport, 2)).toBe(2);
			});

			it('takes the largest scale that fits when the wanted one would not', () => {
				expect(fitScale({ width: 300, height: 700 }, viewport, 2)).toBeCloseTo((800 - EDGE_MARGIN * 2) / 700, 10);
				expect(fitScale({ width: 600, height: 100 }, viewport, 2)).toBeCloseTo((1000 - EDGE_MARGIN * 2) / 600, 10);
			});

			it('puts the panel inside the window at the scale it returns', () => {
				for (const size of [{ width: 448, height: 520 }, { width: 344, height: 700 }, { width: 700, height: 300 }]) {
					const factor = fitScale(size, viewport, 2);
					const drawn = scaleSize(size, factor);
					expect(drawn.width).toBeLessThanOrEqual(viewport.width - EDGE_MARGIN * 2 + 1);
					expect(drawn.height).toBeLessThanOrEqual(viewport.height - EDGE_MARGIN * 2 + 1);
				}
			});

			it('ignores a tiny overflow instead of nudging the scale off its round value', () => {
				expect(fitScale({ width: 300, height: 392.5 }, viewport, 2)).toBe(2);
			});

			it('never shrinks the panel to nothing in a tiny window', () => {
				expect(fitScale({ width: 448, height: 500 }, { width: 40, height: 30 }, 2)).toBe(0.25);
			});

			it('leaves the wanted scale alone before the panel has a size', () => {
				expect(fitScale({ width: 0, height: 0 }, viewport, 1.5)).toBe(1.5);
			});

			it('never enlarges beyond the wanted scale', () => {
				expect(fitScale({ width: 10, height: 10 }, viewport, 0.8)).toBe(0.8);
			});
		});

		it('pins a panel larger than the window to the top-left margin at any scale', () => {
			setViewport(500, 300);
			expect(placementFromAnchor({ ax: 'right', x: 30, ay: 'bottom', y: 30 }, scaleSize(PANEL, 2))).toEqual({ left: EDGE_MARGIN, top: EDGE_MARGIN });
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
