import { computed } from 'vue';
import { getStorage } from '../../storage/storage';
import { usePanelShell } from './panel';

export const INTERFACE_SCALES = [80, 100, 125, 150, 200] as const;
export type InterfaceScale = typeof INTERFACE_SCALES[number];

export const DEFAULT_INTERFACE_SCALE: InterfaceScale = 100;

export interface ScaleOption {
	id: string;
	label: string;
}

export function isInterfaceScale(value: unknown): value is InterfaceScale {
	return typeof value === 'number' && (INTERFACE_SCALES as readonly number[]).includes(value);
}

export function storedInterfaceScale(): InterfaceScale {
	const saved = getStorage('interfaceScale');
	return isInterfaceScale(saved) ? saved : DEFAULT_INTERFACE_SCALE;
}

export function scaleFactor(percent: InterfaceScale): number {
	return percent / 100;
}

export function useInterfaceScaleSetting() {
	const shell = usePanelShell();

	const options: ScaleOption[] = INTERFACE_SCALES.map(percent => ({ id: String(percent), label: `${percent}%` }));
	const choice = computed(() => String(shell.interfaceScale.value));

	function select(id: string): void {
		const percent = INTERFACE_SCALES.find(value => String(value) === id);
		if (percent !== undefined) shell.selectInterfaceScale(percent);
	}

	return { choice, options, select };
}
