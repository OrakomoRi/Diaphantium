import { describe, expect, it } from 'vitest';
import { placeTooltip, type Box } from '@/clicker/ui/tooltip/placement';
import { resolveTooltip } from '@/clicker/ui/tooltip/tooltip';

function box(left: number, top: number, width: number, height: number): Box {
	return { left, top, width, height, right: left + width, bottom: top + height };
}

const base = { size: { width: 100, height: 30 }, viewport: { width: 800, height: 600 }, gap: 8, margin: 8, arrowInset: 12 };

describe('placeTooltip', () => {
	it('centres above the trigger when there is room', () => {
		expect(placeTooltip({ ...base, trigger: box(300, 200, 40, 20), side: 'top' })).toEqual({ left: 270, top: 162, side: 'top', arrow: 50 });
	});

	it('flips below when the trigger is at the top edge', () => {
		expect(placeTooltip({ ...base, trigger: box(300, 10, 40, 20), side: 'top' }).side).toBe('bottom');
	});

	it('stays inside the viewport and points the arrow at the trigger', () => {
		const placement = placeTooltip({ ...base, trigger: box(780, 200, 16, 20), side: 'top' });
		expect(placement.left + base.size.width).toBeLessThanOrEqual(800 - 8);
		expect(placement.arrow).toBe(88);
	});
});

describe('placeTooltip on a scaled panel', () => {
	const trigger = box(300, 200, 40, 20);

	it('is the same at scale 1 as without one', () => {
		expect(placeTooltip({ ...base, trigger, side: 'top', scale: 1 })).toEqual(placeTooltip({ ...base, trigger, side: 'top' }));
	});

	it('draws the scaled size, gap and arrow inset in the window and reports the arrow in its own units', () => {
		const placement = placeTooltip({ ...base, trigger, side: 'top', scale: 2 });

		expect(placement).toEqual({ left: 220, top: 124, side: 'top', arrow: 50 });
		expect(placement.top + 30 * 2 + 8 * 2).toBe(trigger.top);
	});

	it('flips when the scaled tooltip no longer fits above the trigger', () => {
		const near = box(300, 60, 40, 20);

		expect(placeTooltip({ ...base, trigger: near, side: 'top', scale: 1 }).side).toBe('top');
		expect(placeTooltip({ ...base, trigger: near, side: 'top', scale: 2 }).side).toBe('bottom');
	});

	it('keeps a scaled tooltip inside the viewport margin', () => {
		const placement = placeTooltip({ ...base, trigger: box(700, 200, 60, 20), side: 'top', scale: 1.5 });

		expect(placement.left).toBe(800 - 8 - base.size.width * 1.5);
	});

	it('reports the arrow in the tooltip\'s own units', () => {
		const placement = placeTooltip({ ...base, trigger: box(700, 200, 60, 20), side: 'top', scale: 2 });

		expect(placement).toEqual({ left: 592, top: 124, side: 'top', arrow: 69 });
		expect(592 + placement.arrow * 2).toBe(730);
	});
});

describe('resolveTooltip', () => {
	it('drops empty content and fills the defaults', () => {
		expect(resolveTooltip('  ')).toBeNull();
		expect(resolveTooltip({ content: 'Repair kit', kbd: '1' })).toEqual({ content: 'Repair kit', kbd: ['1'], side: 'top', tone: 'default' });
	});
});
