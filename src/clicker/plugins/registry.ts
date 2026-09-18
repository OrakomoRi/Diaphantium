import { computed, reactive, type Component } from 'vue';

export interface SettingsRow {
	id: string;
	pluginId: string;
	label: string;
	hint?: string;
	icon: Component | null;
	getChecked: () => boolean;
	onChange: (checked: boolean) => void;
}

export interface SettingsSection {
	id: string;
	pluginId: string;
	title: string;
	icon: Component | null;
	rows: SettingsRow[];
}

export interface PluginEntry {
	id: string;
	label: string;
	looseRows: SettingsRow[];
	sections: SettingsSection[];
}

export interface LanguageOption {
	id: string;
	label: string;
	name: string;
}

export const plugins = reactive<PluginEntry[]>([]);
export const hasPlugins = computed(() => plugins.length > 0);
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

function entryOf(pluginId: string): PluginEntry {
	let entry = plugins.find(p => p.id === pluginId);
	if (!entry) {
		entry = { id: pluginId, label: pluginId, looseRows: [], sections: [] };
		plugins.push(entry);
	}
	return entry;
}

function pruneIfEmpty(pluginId: string): void {
	const index = plugins.findIndex(p => p.id === pluginId);
	if (index === -1) return;
	const entry = plugins[index]!;
	if (entry.looseRows.length === 0 && entry.sections.length === 0) plugins.splice(index, 1);
}

export function setPluginLabel(pluginId: string, label: string): void {
	entryOf(pluginId).label = label;
}

export function addSettingsRow(row: SettingsRow): () => void {
	const entry = entryOf(row.pluginId);
	const existing = entry.looseRows.findIndex(r => r.id === row.id);
	if (existing === -1) entry.looseRows.push(row);
	else entry.looseRows.splice(existing, 1, row);
	return () => {
		const at = entry.looseRows.findIndex(r => r.id === row.id);
		if (at !== -1) entry.looseRows.splice(at, 1);
		pruneIfEmpty(row.pluginId);
	};
}

export function addSettingsSection(section: SettingsSection): () => void {
	const entry = entryOf(section.pluginId);
	const existing = entry.sections.findIndex(s => s.id === section.id);
	if (existing === -1) entry.sections.push(section);
	else entry.sections.splice(existing, 1, section);
	return () => {
		const at = entry.sections.findIndex(s => s.id === section.id);
		if (at !== -1) entry.sections.splice(at, 1);
		pruneIfEmpty(section.pluginId);
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
