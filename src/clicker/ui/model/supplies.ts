import { onMounted, reactive } from 'vue';
import { getStorage, setStorage } from '../../storage/storage';

export const SUPPLY_KEYS = ['1', '2', '3', '4'] as const;
export type SupplyKey = typeof SUPPLY_KEYS[number];

export function useSupplies() {
	const saved = getStorage('clickValues') || [];

	const states = reactive(Object.fromEntries(
		SUPPLY_KEYS.map(key => [key, saved.find(value => value.key === key)?.value || 'off']),
	) as Record<SupplyKey, string>);

	function save(): void {
		setStorage('clickValues', SUPPLY_KEYS.map(key => ({ key, value: states[key] })));
	}

	function toggle(key: SupplyKey): void {
		states[key] = states[key] === 'on' ? 'off' : 'on';
		save();
	}

	onMounted(() => {
		if (saved.length === 0) save();
	});

	return { states, toggle };
}
