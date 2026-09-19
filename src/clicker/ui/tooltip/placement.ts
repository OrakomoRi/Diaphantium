export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export interface Box {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

export interface TooltipPlacementInput {
	trigger: Box;
	size: { width: number; height: number };
	viewport: { width: number; height: number };
	side: TooltipSide;
	gap: number;
	margin: number;
	arrowInset: number;
	scale?: number;
}

export interface TooltipPlacement {
	left: number;
	top: number;
	side: TooltipSide;
	arrow: number;
}

const OPPOSITE: Record<TooltipSide, TooltipSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

const isVertical = (side: TooltipSide) => side === 'top' || side === 'bottom';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

function sideOrder(side: TooltipSide): TooltipSide[] {
	return isVertical(side) ? [side, OPPOSITE[side], 'right', 'left'] : [side, OPPOSITE[side], 'top', 'bottom'];
}

export function placeTooltip({ trigger, size: layoutSize, viewport, side, gap: layoutGap, margin, arrowInset: layoutArrowInset, scale = 1 }: TooltipPlacementInput): TooltipPlacement {
	const size = { width: layoutSize.width * scale, height: layoutSize.height * scale };
	const gap = layoutGap * scale;
	const arrowInset = layoutArrowInset * scale;
	const space: Record<TooltipSide, number> = {
		top: trigger.top - margin,
		bottom: viewport.height - margin - trigger.bottom,
		left: trigger.left - margin,
		right: viewport.width - margin - trigger.right,
	};
	const slack = (candidate: TooltipSide) => {
		const main = space[candidate] - gap - (isVertical(candidate) ? size.height : size.width);
		const cross = isVertical(candidate) ? viewport.width - 2 * margin - size.width : viewport.height - 2 * margin - size.height;
		return Math.min(main, cross);
	};

	const order = sideOrder(side);
	const chosen = order.find(candidate => slack(candidate) >= 0) ?? order.reduce((best, candidate) => (slack(candidate) > slack(best) ? candidate : best));

	let left: number;
	let top: number;
	if (isVertical(chosen)) {
		top = chosen === 'top' ? trigger.top - gap - size.height : trigger.bottom + gap;
		left = clamp(trigger.left + trigger.width / 2 - size.width / 2, margin, viewport.width - margin - size.width);
		left = clamp(left, trigger.left + arrowInset - size.width, trigger.right - arrowInset);
		top = clamp(top, margin, Math.max(margin, viewport.height - margin - size.height));
	} else {
		left = chosen === 'left' ? trigger.left - gap - size.width : trigger.right + gap;
		top = clamp(trigger.top + trigger.height / 2 - size.height / 2, margin, viewport.height - margin - size.height);
		top = clamp(top, trigger.top + arrowInset - size.height, trigger.bottom - arrowInset);
		left = clamp(left, margin, Math.max(margin, viewport.width - margin - size.width));
	}

	const arrow = isVertical(chosen)
		? clamp(trigger.left + trigger.width / 2 - left, arrowInset, size.width - arrowInset)
		: clamp(trigger.top + trigger.height / 2 - top, arrowInset, size.height - arrowInset);

	return { left, top, side: chosen, arrow: arrow / scale };
}
