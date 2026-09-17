import { reactive } from 'vue';

export interface SettingsRow {
	id: string;
	pluginId: string;
	label: string;
	hint?: string;
	getChecked: () => boolean;
	onChange: (checked: boolean) => void;
}

export interface LanguageOption {
	id: string;
	label: string;
	name: string;
}

export const settingsRows = reactive<SettingsRow[]>([]);
export const languages = reactive<LanguageOption[]>([]);
export const runtimeLocales = new Set<string>();

const languageChangeListeners = new Set<(locale: string) => void>();

export function onLanguageChange(fn: (locale: string) => void): () => void {
	languageChangeListeners.add(fn);
	return () => languageChangeListeners.delete(fn);
}

export function notifyLanguageChange(locale: string): void {
	for (const fn of languageChangeListeners) fn(locale);
}

function rowIndex(pluginId: string, id: string): number {
	return settingsRows.findIndex(row => row.pluginId === pluginId && row.id === id);
}

export function addSettingsRow(row: SettingsRow): () => void {
	const existing = rowIndex(row.pluginId, row.id);
	if (existing === -1) settingsRows.push(row);
	else settingsRows.splice(existing, 1, row);
	return () => {
		const at = rowIndex(row.pluginId, row.id);
		if (at !== -1) settingsRows.splice(at, 1);
	};
}

export function addLanguageOption(option: LanguageOption): void {
	runtimeLocales.add(option.id);
	if (languages.some(existing => existing.id === option.id)) return;
	languages.push(option);
}

const STORAGE_PREFIX = 'Diaphantium.plugins.';

export function pluginStorage(pluginId: string) {
	const key = `${STORAGE_PREFIX}${pluginId}`;

	function load(): Record<string, unknown> {
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
		} catch {
			return {};
		}
	}

	return {
		get<T>(field: string): T | null {
			const data = load();
			return Object.hasOwn(data, field) ? (data[field] as T) : null;
		},
		set<T>(field: string, value: T): void {
			const data = load();
			data[field] = value;
			try {
				localStorage.setItem(key, JSON.stringify(data));
			} catch {}
		},
	};
}
