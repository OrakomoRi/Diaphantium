import { smoothstep } from './springs';

export const THEME_SWITCH_SECONDS = 0.8;
export const CONTENT_RISE = 8;

export interface SwitchPhases {
	outgoingContent: number;
	morph: number;
	incomingSurface: number;
	outgoingSurface: number;
	incomingContent: number;
}

export interface Shape {
	x: number;
	y: number;
	width: number;
	height: number;
	radius: number;
}

function phase(progress: number, start: number, end: number): number {
	return smoothstep((progress - start) / (end - start));
}

export function switchPhases(progress: number): SwitchPhases {
	return {
		outgoingContent: 1 - phase(progress, 0, 0.3),
		morph: phase(progress, 0.2, 0.8),
		incomingSurface: phase(progress, 0.3, 0.55),
		outgoingSurface: 1 - phase(progress, 0.55, 0.8),
		incomingContent: phase(progress, 0.72, 1),
	};
}

function mix(from: number, to: number, amount: number): number {
	return from + (to - from) * amount;
}

export function mixShape(from: Shape, to: Shape, amount: number): Shape {
	return {
		x: mix(from.x, to.x, amount),
		y: mix(from.y, to.y, amount),
		width: mix(from.width, to.width, amount),
		height: mix(from.height, to.height, amount),
		radius: mix(from.radius, to.radius, amount),
	};
}

export function surfaceTransform(shape: Shape, own: Shape): { transform: string; borderRadius: string } {
	const scaleX = shape.width / own.width;
	const scaleY = shape.height / own.height;
	return {
		transform: `translate3d(${shape.x - own.x}px, ${shape.y - own.y}px, 0) scale(${scaleX}, ${scaleY})`,
		borderRadius: `${shape.radius / scaleX}px / ${shape.radius / scaleY}px`,
	};
}
