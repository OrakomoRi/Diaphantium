import { animate } from 'motion';
import { prefersReducedMotion } from './springs';

const SHAKE = [null, -1.6, 3.2, -6.4, 6.4, -6.4, 6.4, -6.4, 3.2, -1.6, 0];

export function shake(element: HTMLElement | null): void {
	if (!element || prefersReducedMotion()) return;
	animate(element, { x: SHAKE }, { duration: 0.2, ease: [0.36, 0.07, 0.19, 0.97] });
}
