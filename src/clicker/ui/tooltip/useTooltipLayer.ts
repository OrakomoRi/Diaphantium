import { nextTick, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue';
import { cancelFrame, frame } from 'motion';
import { placeTooltip, type TooltipSide } from './placement';
import { activeTooltip, hideTooltip, type ActiveTooltip, type ResolvedTooltip } from './tooltip';
import { clamp, prefersReducedMotion, toValue, type SpringPreset } from '../motion/springs';
import { useMotionValues } from '../motion/values';

export interface TooltipLayerOptions {
	gap: number;
	margin: number;
	arrowInset: number;
	shift: number;
	fade: SpringPreset;
	glide: SpringPreset;
}

export interface TooltipLayer {
	root: Ref<HTMLElement | null>;
	shown: Ref<ResolvedTooltip | null>;
	side: Ref<TooltipSide>;
	arrow: Ref<number>;
}

export function useTooltipLayer(options: TooltipLayerOptions): TooltipLayer {
	const root = ref<HTMLElement | null>(null);
	const shown = shallowRef<ResolvedTooltip | null>(null);
	const side = ref<TooltipSide>('top');
	const arrow = ref(0);

	const values = useMotionValues({ x: 0, y: 0, opacity: 0 }, render);

	let tracking = false;
	let lastKey = '';
	let placed = false;
	let clips: HTMLElement[] = [];

	function render(): void {
		const element = root.value;
		if (!element) return;
		const opacity = clamp(values.opacity.get(), 0, 1);
		const offset = (1 - opacity) * options.shift;
		const dx = side.value === 'left' ? offset : side.value === 'right' ? -offset : 0;
		const dy = side.value === 'top' ? offset : side.value === 'bottom' ? -offset : 0;
		element.style.opacity = String(opacity);
		element.style.transform = `translate3d(${values.x.get() + dx}px, ${values.y.get() + dy}px, 0)`;
		element.style.visibility = opacity <= 0.01 && !activeTooltip.value ? 'hidden' : 'visible';
	}

	function clippingAncestors(el: HTMLElement): HTMLElement[] {
		const out: HTMLElement[] = [];
		for (let node = el.parentElement; node; node = node.parentElement) {
			const style = getComputedStyle(node);
			if (/auto|scroll|hidden|clip/.test(`${style.overflowX} ${style.overflowY}`)) out.push(node);
		}
		return out;
	}

	function clipped(box: DOMRect): boolean {
		let left = box.left;
		let top = box.top;
		let right = box.right;
		let bottom = box.bottom;
		for (const clip of clips) {
			const r = clip.getBoundingClientRect();
			left = Math.max(left, r.left);
			top = Math.max(top, r.top);
			right = Math.min(right, r.right);
			bottom = Math.min(bottom, r.bottom);
		}
		return right - left < 4 || bottom - top < 4;
	}

	function position(current: ActiveTooltip, glide: boolean, immediate: boolean): boolean {
		const element = root.value;
		const trigger = current.trigger.el;
		if (!element) return false;
		if (!trigger.isConnected || trigger.closest('[inert]')) {
			hideTooltip();
			return false;
		}
		const box = trigger.getBoundingClientRect();
		if ((box.width === 0 && box.height === 0) || clipped(box)) {
			hideTooltip();
			return false;
		}
		const width = element.offsetWidth;
		const height = element.offsetHeight;
		const viewport = { width: document.documentElement.clientWidth || window.innerWidth, height: window.innerHeight };
		const key = `${Math.round(box.left)},${Math.round(box.top)},${Math.round(box.width)},${Math.round(box.height)},${width},${height},${viewport.width},${viewport.height},${current.options.side}`;
		if (key === lastKey) return true;
		lastKey = key;

		const placement = placeTooltip({ trigger: box, size: { width, height }, viewport, side: current.options.side, gap: options.gap, margin: options.margin, arrowInset: options.arrowInset });
		const left = Math.round(placement.left);
		const top = Math.round(placement.top);
		const write = () => {
			side.value = placement.side;
			arrow.value = Math.round(placement.arrow);
			if ((glide && placed && !prefersReducedMotion()) || values.x.isAnimating() || values.y.isAnimating()) {
				toValue(values.x, left, options.glide);
				toValue(values.y, top, options.glide);
			} else {
				values.x.jump(left);
				values.y.jump(top);
				render();
			}
			placed = true;
		};
		if (immediate) write();
		else frame.render(write);
		return true;
	}

	function track(): void {
		const current = activeTooltip.value;
		if (!current || !position(current, false, false)) stopTracking();
	}

	function startTracking(): void {
		if (tracking) return;
		tracking = true;
		frame.read(track, true);
	}

	function stopTracking(): void {
		if (!tracking) return;
		tracking = false;
		cancelFrame(track);
	}

	watch(activeTooltip, async (next, previous) => {
		if (!next) {
			stopTracking();
			toValue(values.opacity, 0, options.fade);
			return;
		}
		shown.value = next.options;
		if (previous?.trigger !== next.trigger) clips = clippingAncestors(next.trigger.el);
		await nextTick();
		if (activeTooltip.value !== next) return;
		const visible = values.opacity.get() > 0.05;
		if (!visible) placed = false;
		lastKey = '';
		if (!position(next, visible, true)) return;
		toValue(values.opacity, 1, options.fade);
		startTracking();
	});

	onBeforeUnmount(() => {
		stopTracking();
		hideTooltip();
	});

	return { root, shown, side, arrow };
}
