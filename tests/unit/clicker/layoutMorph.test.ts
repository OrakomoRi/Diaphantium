import { describe, expect, it } from 'vitest';
import { projectBox, sameBox, visualBox, type Box, type Projection } from '@/clicker/ui/motion/layoutMorph';

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

describe('sameBox', () => {
	it('ignores sub-pixel noise', () => {
		expect(sameBox({ x: 0, y: 0, width: 10, height: 10 }, { x: 0.2, y: 0.3, width: 10.4, height: 9.7 })).toBe(true);
		expect(sameBox({ x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 1, width: 10, height: 10 })).toBe(false);
	});
});
