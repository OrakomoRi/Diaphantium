export const EDGE_MARGIN = 8;

const MAX_OFFSET = 100000;

const INTERACTIVE = 'button, input, textarea, select, a, label, [role="slider"], [role="switch"], [data-no-drag], [role="tab"], .supply, .hotkey__reset';

export interface Anchor {
	ax: 'left' | 'right';
	x: number;
	ay: 'top' | 'bottom';
	y: number;
}

export interface Placement {
	left: number;
	top: number;
}

export interface Size {
	width: number;
	height: number;
}

export function scaleSize(size: Size, factor: number): Size {
	return { width: size.width * factor, height: size.height * factor };
}

const MIN_FIT_SCALE = 0.25;
const FIT_TOLERANCE = 0.995;

export function fitScale(size: Size, viewport: Size, wanted: number): number {
	if (size.width <= 0 || size.height <= 0) return wanted;
	const room = Math.min((viewport.width - EDGE_MARGIN * 2) / size.width, (viewport.height - EDGE_MARGIN * 2) / size.height);
	return room >= wanted * FIT_TOLERANCE ? wanted : Math.max(MIN_FIT_SCALE, room);
}

export function panelTransform(placement: Placement, factor: number): string {
	return `translate3d(${Math.round(placement.left)}px, ${Math.round(placement.top)}px, 0) scale(${factor})`;
}

export function viewportSize(): Size {
	const root = document.documentElement;
	return {
		width: root.clientWidth || window.innerWidth,
		height: root.clientHeight || window.innerHeight,
	};
}

export function clampPlacement(placement: Placement, size: Size): Placement {
	const viewport = viewportSize();
	const maxLeft = Math.max(EDGE_MARGIN, viewport.width - size.width - EDGE_MARGIN);
	const maxTop = Math.max(EDGE_MARGIN, viewport.height - size.height - EDGE_MARGIN);
	return {
		left: Math.min(Math.max(placement.left, EDGE_MARGIN), maxLeft),
		top: Math.min(Math.max(placement.top, EDGE_MARGIN), maxTop),
	};
}

export function placementFromAnchor(anchor: Anchor, size: Size): Placement {
	const viewport = viewportSize();
	const left = anchor.ax === 'left' ? anchor.x : viewport.width - anchor.x - size.width;
	const top = anchor.ay === 'top' ? anchor.y : viewport.height - anchor.y - size.height;
	return clampPlacement({ left, top }, size);
}

export function anchorFromPlacement(placement: Placement, size: Size): Anchor {
	const viewport = viewportSize();
	const ax = placement.left + size.width / 2 < viewport.width / 2 ? 'left' : 'right';
	const ay = placement.top + size.height / 2 < viewport.height / 2 ? 'top' : 'bottom';
	return {
		ax,
		x: Math.round(ax === 'left' ? placement.left : viewport.width - placement.left - size.width),
		ay,
		y: Math.round(ay === 'top' ? placement.top : viewport.height - placement.top - size.height),
	};
}

function offset(value: unknown, fallback: number): number {
	const number = typeof value === 'number' ? Math.round(value) : NaN;
	return Number.isFinite(number) ? Math.min(MAX_OFFSET, Math.max(0, number)) : fallback;
}

export function readAnchor(saved: unknown, fallback: Anchor): Anchor {
	if (!saved || typeof saved !== 'object') return fallback;
	const { anchor, left, top } = saved as { anchor?: unknown; left?: unknown; top?: unknown };

	if (anchor && typeof anchor === 'object') {
		const a = anchor as Record<string, unknown>;
		return {
			ax: a.ax === 'right' ? 'right' : 'left',
			x: offset(a.x, fallback.x),
			ay: a.ay === 'bottom' ? 'bottom' : 'top',
			y: offset(a.y, fallback.y),
		};
	}

	return {
		ax: 'left',
		x: offset(left, fallback.x),
		ay: 'top',
		y: offset(top, fallback.y),
	};
}

export interface DragHooks {
	canStart?: () => boolean;
	onStart: () => void;
	current: () => Placement;
	size: () => Size;
	onMove: (placement: Placement) => void;
	onEnd: (placement: Placement) => void;
}

export function attachDrag(handle: HTMLElement, hooks: DragHooks): () => void {
	let pointerId: number | null = null;
	let originX = 0;
	let originY = 0;
	let start: Placement = { left: 0, top: 0 };
	let last: Placement = start;
	let frame = 0;
	let pending: Placement | null = null;

	function startsOnInteractive(event: PointerEvent): boolean {
		for (const node of event.composedPath()) {
			if (node === handle) return false;
			if (node instanceof Element && node.matches(INTERACTIVE)) return true;
		}
		return false;
	}

	function flush(): void {
		frame = 0;
		if (pending) {
			hooks.onMove(pending);
			pending = null;
		}
	}

	function finish(): void {
		pointerId = null;
		if (frame) {
			cancelAnimationFrame(frame);
			flush();
		}
		hooks.onEnd(last);
	}

	function onDown(event: PointerEvent): void {
		if (pointerId !== null || !event.isPrimary || event.button !== 0 || hooks.canStart?.() === false || startsOnInteractive(event)) return;
		pointerId = event.pointerId;
		originX = event.clientX;
		originY = event.clientY;
		start = hooks.current();
		last = start;
		hooks.onStart();
		handle.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function onMove(event: PointerEvent): void {
		if (event.pointerId !== pointerId) return;
		last = clampPlacement({ left: start.left + event.clientX - originX, top: start.top + event.clientY - originY }, hooks.size());
		pending = last;
		if (!frame) frame = requestAnimationFrame(flush);
	}

	function onEnd(event: PointerEvent): void {
		if (event.pointerId !== pointerId) return;
		finish();
		if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
	}

	handle.addEventListener('pointerdown', onDown);
	handle.addEventListener('pointermove', onMove);
	handle.addEventListener('pointerup', onEnd);
	handle.addEventListener('pointercancel', onEnd);
	handle.addEventListener('lostpointercapture', onEnd);

	return () => {
		handle.removeEventListener('pointerdown', onDown);
		handle.removeEventListener('pointermove', onMove);
		handle.removeEventListener('pointerup', onEnd);
		handle.removeEventListener('pointercancel', onEnd);
		handle.removeEventListener('lostpointercapture', onEnd);
		if (pointerId !== null) finish();
	};
}
