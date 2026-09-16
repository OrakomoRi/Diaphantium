import { watch, type Ref } from 'vue';
import { EDGE_MARGIN } from '../../core/position';
import { usePanelShell } from './panel';

const MIN_CAP = 96;

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
		const chrome = box.offsetHeight - parseFloat(getComputedStyle(element).height);
		const cap = Math.max(MIN_CAP, Math.floor(shell.viewportHeight.value - EDGE_MARGIN * 2 - chrome));
		if (cap === last) return;
		last = cap;
		element.style.setProperty('--stack-cap', `${cap}px`);
	}

	watch(shell.viewportHeight, update);

	return { panel, update };
}
