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

describe('resolveTooltip', () => {
	it('drops empty content and fills the defaults', () => {
		expect(resolveTooltip('  ')).toBeNull();
		expect(resolveTooltip({ content: 'Repair kit', kbd: '1' })).toEqual({ content: 'Repair kit', kbd: ['1'], side: 'top', tone: 'default' });
	});
});
