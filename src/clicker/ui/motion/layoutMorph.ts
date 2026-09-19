import { animate, cancelFrame, frame, motionValue, type AnimationPlaybackControlsWithThen } from 'motion';
import { nextTick } from 'vue';
import { prefersReducedMotion, smoothstep, spring, type SpringPreset } from './springs';

export type LayoutMode = 'size' | 'position' | 'text';

export interface LayoutMorphOptions {
	size: string;
	position: string;
	text: string;
	spring: SpringPreset;
}

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Projection {
	x: number;
	y: number;
	scaleX: number;
	scaleY: number;
}

export interface LayoutMorph {
	run: (update: () => void) => Promise<void>;
	stop: () => void;
	destroy: () => void;
}

interface LayoutNode {
	element: HTMLElement;
	mode: LayoutMode;
	parent: LayoutNode | null;
	from: Box;
	to: Box;
	visual: Box;
	radius: number;
	fade: boolean;
}

export const TEXT_FADE_END = 0.6;

function mix(from: number, to: number, amount: number): number {
	return from + (to - from) * amount;
}

function ratio(value: number, base: number): number {
	return base > 0 ? value / base : 1;
}

export function sameBox(a: Box, b: Box): boolean {
	return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

export function visualBox(from: Box, to: Box, progress: number, mode: LayoutMode): Box {
	return {
		x: mix(from.x, to.x, progress),
		y: mix(from.y, to.y, progress),
		width: mode === 'size' ? mix(from.width, to.width, progress) : to.width,
		height: mode === 'size' ? mix(from.height, to.height, progress) : to.height,
	};
}

export function projectBox(visual: Box, layout: Box, parent?: { visual: Box; layout: Box }): Projection {
	const parentScaleX = parent ? ratio(parent.visual.width, parent.layout.width) : 1;
	const parentScaleY = parent ? ratio(parent.visual.height, parent.layout.height) : 1;
	return {
		x: (visual.x - (parent?.visual.x ?? 0)) / parentScaleX - (layout.x - (parent?.layout.x ?? 0)),
		y: (visual.y - (parent?.visual.y ?? 0)) / parentScaleY - (layout.y - (parent?.layout.y ?? 0)),
		scaleX: ratio(visual.width, layout.width) / parentScaleX,
		scaleY: ratio(visual.height, layout.height) / parentScaleY,
	};
}

export function unscaleBox(box: Box, factor: number): Box {
	return { x: box.x / factor, y: box.y / factor, width: box.width / factor, height: box.height / factor };
}

function measure(element: HTMLElement, factor: number): Box {
	const rect = element.getBoundingClientRect();
	return unscaleBox({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, factor);
}

export function createLayoutMorph(scope: () => ParentNode | null, options: () => LayoutMorphOptions, scale: () => number = () => 1): LayoutMorph {
	const progress = motionValue(0);
	let nodes: LayoutNode[] = [];
	let running: AnimationPlaybackControlsWithThen | null = null;

	const stopListening = progress.on('change', () => frame.render(render));

	function collect(root: ParentNode, selectors: LayoutMorphOptions): HTMLElement[] {
		return [...root.querySelectorAll<HTMLElement>(`${selectors.size}, ${selectors.position}, ${selectors.text}`)].filter(element => !element.closest('[inert]'));
	}

	function modeOf(element: HTMLElement, selectors: LayoutMorphOptions): LayoutMode {
		if (element.matches(selectors.text)) return 'text';
		return element.matches(selectors.size) ? 'size' : 'position';
	}

	function parentOf(element: HTMLElement, known: Map<HTMLElement, LayoutNode>): LayoutNode | null {
		for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
			const node = known.get(ancestor);
			if (node) return node;
		}
		return null;
	}

	function render(): void {
		const amount = progress.get();
		for (const node of nodes) {
			node.visual = visualBox(node.from, node.to, amount, node.mode);
			const projection = projectBox(node.visual, node.to, node.parent ? { visual: node.parent.visual, layout: node.parent.to } : undefined);
			const style = node.element.style;
			style.transformOrigin = '0 0';
			style.transform = `translate3d(${projection.x}px, ${projection.y}px, 0) scale(${projection.scaleX}, ${projection.scaleY})`;
			if (node.radius > 0) {
				const scaleX = ratio(node.visual.width, node.to.width);
				const scaleY = ratio(node.visual.height, node.to.height);
				style.borderRadius = `${node.radius / scaleX}px / ${node.radius / scaleY}px`;
			}
			if (node.fade) style.opacity = String(smoothstep(amount / TEXT_FADE_END));
		}
	}

	function stop(): void {
		running?.stop();
		running = null;
		cancelFrame(render);
		for (const { element, radius, fade } of nodes) {
			element.style.transform = '';
			element.style.transformOrigin = '';
			if (radius > 0) element.style.borderRadius = '';
			if (fade) element.style.opacity = '';
		}
		nodes = [];
	}

	async function run(update: () => void): Promise<void> {
		const root = scope();
		const selectors = options();
		if (!root || prefersReducedMotion()) {
			stop();
			update();
			return;
		}

		const factor = scale();
		const before = new Map(collect(root, selectors).map(element => [element, { box: measure(element, factor), text: element.textContent }]));
		stop();
		update();
		await nextTick();

		const known = new Map<HTMLElement, LayoutNode>();
		const next = collect(root, selectors).map(element => {
			const previous = before.get(element);
			const mode = modeOf(element, selectors);
			const to = measure(element, factor);
			const from = previous?.box ?? to;
			const node: LayoutNode = {
				element,
				mode,
				parent: parentOf(element, known),
				from,
				to,
				visual: from,
				radius: mode === 'size' ? parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0 : 0,
				fade: mode === 'text' && previous !== undefined && previous.text !== element.textContent,
			};
			known.set(element, node);
			return node;
		});
		if (!next.some(node => node.fade || !sameBox(node.from, node.to))) return;

		nodes = next;
		progress.jump(0);
		render();
		const animation = animate(progress, 1, spring(selectors.spring));
		running = animation;
		animation.then(() => {
			if (running === animation) stop();
		});
	}

	function destroy(): void {
		stop();
		stopListening();
		progress.destroy();
	}

	return { run, stop, destroy };
}
