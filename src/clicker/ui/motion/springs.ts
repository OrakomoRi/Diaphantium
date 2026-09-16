import { animate, type MotionValue } from 'motion';

export type SpringPreset =
	| { visualDuration: number; bounce: number }
	| { stiffness: number; damping: number; mass: number };

const reducedMotion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export function prefersReducedMotion(): boolean {
	return reducedMotion?.matches ?? false;
}

export function spring(preset: SpringPreset) {
	if (prefersReducedMotion()) return { duration: 0 };
	return { type: 'spring' as const, ...preset };
}

export function toValue(value: MotionValue<number>, target: number, preset: SpringPreset) {
	return animate(value, target, spring(preset));
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function smoothstep(value: number): number {
	const t = clamp(value, 0, 1);
	return t * t * (3 - 2 * t);
}
