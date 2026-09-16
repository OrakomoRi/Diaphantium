import { watch, type Ref } from 'vue';
import { animate } from 'motion';
import { clamp, spring, toValue } from '../../motion/springs';
import { useHover, usePress } from '../../motion/gestures';
import { useMotionValues } from '../../motion/values';
import { SPRINGS } from './springs';

const HOVER = 0.55;

export function useStateLayer(target: Ref<HTMLElement | null>, layer: Ref<HTMLElement | null>, disabled: () => boolean = () => false): void {
	let hovered = false;
	let pressed = false;

	const values = useMotionValues({ level: 0 }, () => {
		if (layer.value) layer.value.style.opacity = String(clamp(values.level.get(), 0, 1));
	});

	function update(): void {
		const level = disabled() ? 0 : pressed ? 1 : hovered ? HOVER : 0;
		toValue(values.level, level, pressed ? SPRINGS.snappy : SPRINGS.fade);
	}

	useHover(target, next => {
		hovered = next;
		update();
	});
	usePress(target, next => {
		pressed = next;
		update();
	});
	watch(disabled, update);
}

export function glow(element: HTMLElement | null, on: boolean): void {
	if (element) animate(element, { opacity: on ? 1 : 0 }, spring(SPRINGS.fade));
}

export function flash(element: HTMLElement | null): void {
	if (element) animate(element, { opacity: [0, 1, 1, 0] }, { duration: 0.6, times: [0, 0.16, 0.5, 1], ease: 'easeOut' });
}

export function flashError(element: HTMLElement | null): void {
	if (element) animate(element, { opacity: [1, 1, 0] }, { duration: 0.7, times: [0, 0.35, 1], ease: 'easeOut' });
}
