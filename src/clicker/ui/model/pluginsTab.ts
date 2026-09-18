import { computed, ref, watch } from 'vue';
import { plugins, type PluginEntry } from '../../plugins/registry';

export interface PluginOption {
	id: string;
	label: string;
}

export function usePluginPicker() {
	const options = computed<PluginOption[]>(() => plugins.map(p => ({ id: p.id, label: p.label })));
	const selected = ref<string | null>(options.value[0]?.id ?? null);

	watch(options, list => {
		if (list.some(option => option.id === selected.value)) return;
		selected.value = list[0]?.id ?? null;
	});

	const current = computed<PluginEntry | null>(() => plugins.find(p => p.id === selected.value) ?? null);

	function select(id: string): void {
		selected.value = id;
	}

	return { options, selected, current, select };
}
