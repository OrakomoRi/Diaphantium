import { watch, type Ref } from 'vue';
import { usePanelShell } from './panel';

const MIN_CAP = 96;
const MAX_CAP = 640;

export interface StackCap {
	panel: () => HTMLElement | null;
	update: () => void;
}

export function useStackCap(stack: Ref<HTMLElement | null>): StackCap {
	const shell = usePanelShell();
	let last = -1;

	function panel(): HTMLElement | null {
		return stack.value?.closest<HTMLElement>('.popup__window') ?? null;
	}

	function update(): void {
		const element = stack.value;
		const box = panel();
		if (!element || !box) return;
		const chrome = parseFloat(getComputedStyle(box).height) - parseFloat(getComputedStyle(element).height);
		const cap = Math.max(MIN_CAP, Math.min(MAX_CAP, Math.floor(shell.availableHeight.value - chrome)));
		if (cap === last) return;
		last = cap;
		element.style.setProperty('--stack-cap', `${cap}px`);
	}

	watch(shell.availableHeight, update);

	return { panel, update };
}
