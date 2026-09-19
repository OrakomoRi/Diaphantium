import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLayoutMorph, projectBox, sameBox, unscaleBox, visualBox, type Box, type Projection } from '@/clicker/ui/motion/layoutMorph';

function apply(projection: Projection, layout: Box, box: Box): Box {
	return {
		x: layout.x + projection.x + projection.scaleX * (box.x - layout.x),
		y: layout.y + projection.y + projection.scaleY * (box.y - layout.y),
		width: box.width * projection.scaleX,
		height: box.height * projection.scaleY,
	};
}

function expectBox(actual: Box, expected: Box): void {
	expect(actual.x).toBeCloseTo(expected.x, 6);
	expect(actual.y).toBeCloseTo(expected.y, 6);
	expect(actual.width).toBeCloseTo(expected.width, 6);
	expect(actual.height).toBeCloseTo(expected.height, 6);
}

describe('visualBox', () => {
	const from = { x: 10, y: 100, width: 200, height: 60 };
	const to = { x: 10, y: 130, width: 240, height: 90 };

	it('starts where the element was and ends where it is laid out', () => {
		for (const mode of ['size', 'position', 'text'] as const) {
			expect(visualBox(from, to, 1, mode)).toEqual(to);
		}
		expect(visualBox(from, to, 0, 'size')).toEqual(from);
	});

	it('changes the size only of a size node, and moves the others by their start edge', () => {
		expect(visualBox(from, to, 0.5, 'size')).toEqual({ x: 10, y: 115, width: 220, height: 75 });
		expect(visualBox(from, to, 0.5, 'position')).toEqual({ x: 10, y: 115, width: 240, height: 90 });
		expect(visualBox(from, to, 0, 'text')).toEqual({ x: 10, y: 100, width: 240, height: 90 });
	});
});

describe('projectBox', () => {
	it('draws a lone node at its visual box', () => {
		const layout = { x: 20, y: 40, width: 300, height: 120 };
		const visual = { x: 26, y: 30, width: 280, height: 150 };
		expectBox(apply(projectBox(visual, layout), layout, layout), visual);
	});

	it('keeps a child at its own visual box inside a scaled parent, unscaled', () => {
		const parentLayout = { x: 100, y: 200, width: 400, height: 180 };
		const parentVisual = { x: 100, y: 190, width: 400, height: 150 };
		const childLayout = { x: 116, y: 260, width: 180, height: 40 };
		const childVisual = { x: 116, y: 240, width: 180, height: 40 };

		const parent = projectBox(parentVisual, parentLayout);
		const child = projectBox(childVisual, childLayout, { visual: parentVisual, layout: parentLayout });
		const drawn = apply(parent, parentLayout, apply(child, childLayout, childLayout));

		expectBox(drawn, childVisual);
	});

	it('stays still when nothing moved', () => {
		const box = { x: 5, y: 6, width: 70, height: 80 };
		expect(projectBox(box, box, { visual: box, layout: box })).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
	});

	it('does not divide by an empty box', () => {
		const empty = { x: 0, y: 0, width: 0, height: 0 };
		expect(projectBox(empty, empty)).toEqual({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
	});
});

describe('a panel scaled by the interface size', () => {
	const scaled = (box: Box, factor: number): Box => ({ x: box.x * factor, y: box.y * factor, width: box.width * factor, height: box.height * factor });

	it('gives back the box the element has in its own units', () => {
		const box = { x: 30, y: 60, width: 200, height: 80 };
		for (const factor of [0.8, 1, 1.25, 1.5, 2]) {
			const own = unscaleBox(scaled(box, factor), factor);
			expect(own.x).toBeCloseTo(box.x, 9);
			expect(own.y).toBeCloseTo(box.y, 9);
			expect(own.width).toBeCloseTo(box.width, 9);
			expect(own.height).toBeCloseTo(box.height, 9);
		}
	});

	it('would move an element by the scale too far if the boxes were not brought back to its own units', () => {
		const before = { x: 116, y: 230, width: 180, height: 40 };
		const after = { x: 116, y: 290, width: 180, height: 40 };

		expect(projectBox(scaled(before, 2), scaled(after, 2)).y).toBe(-120);
		expect(projectBox(unscaleBox(scaled(before, 2), 2), unscaleBox(scaled(after, 2), 2)).y).toBe(-60);
	});

	describe('morph', () => {
		let scope: HTMLElement;
		let row: HTMLElement;
		let top: number;
		let left: number;

		beforeEach(() => {
			scope = document.createElement('div');
			row = document.createElement('div');
			row.className = 'row';
			scope.append(row);
			document.body.append(scope);
			row.getBoundingClientRect = () => new DOMRect(left, top, 360, 80);
		});

		afterEach(() => {
			scope.remove();
		});

		function createMorph(factor: number) {
			return createLayoutMorph(() => scope, () => ({ size: '.card', position: '.row', text: '.title', spring: { visualDuration: 0.3, bounce: 0 } }), () => factor);
		}

		it.each([0.8, 1, 1.25, 1.5, 2])('starts an element where it was drawn, in its own units, at scale %s', async factor => {
			top = 230 * factor;
			left = 116 * factor;
			const morph = createMorph(factor);

			await morph.run(() => {
				top = 290 * factor;
			});

			expect(row.style.transform).toBe('translate3d(0px, -60px, 0) scale(1, 1)');
			morph.destroy();
			expect(row.style.transform).toBe('');
		});

		it('draws it 120 px too far at scale 2 when the scale is left out', async () => {
			top = 460;
			left = 232;
			const morph = createLayoutMorph(() => scope, () => ({ size: '.card', position: '.row', text: '.title', spring: { visualDuration: 0.3, bounce: 0 } }));

			await morph.run(() => {
				top = 580;
			});

			expect(row.style.transform).toBe('translate3d(0px, -120px, 0) scale(1, 1)');
			morph.destroy();
		});
	});
});

describe('sameBox', () => {
	it('ignores sub-pixel noise', () => {
		expect(sameBox({ x: 0, y: 0, width: 10, height: 10 }, { x: 0.2, y: 0.3, width: 10.4, height: 9.7 })).toBe(true);
		expect(sameBox({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 1, width: 10, height: 10 })).toBe(false);
	});
});
