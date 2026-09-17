import type { FeatureName } from '../core/Clicker';

export interface PluginManifest {
	id: string;
	apiVersion: 1;
}

export interface PluginFeaturesApi {
	isEnabled(name: FeatureName): boolean;
	onChange(name: FeatureName, fn: (enabled: boolean) => void): () => void;
	provideAction(name: FeatureName, action: () => void): () => void;
	theme(): string;
	language(): string;
}

export interface PluginSettingsToggle {
	id: string;
	label: string;
	hint?: string;
	getChecked: () => boolean;
	onChange: (checked: boolean) => void;
}

export interface PluginLanguageOption {
	id: string;
	label: string;
	name: string;
}

export interface PluginI18nApi {
	addTranslations(locale: string, messages: Record<string, unknown>): void;
	addLanguage(option: PluginLanguageOption, messages: Record<string, unknown>): void;
}

export interface PluginStorageApi {
	get<T>(key: string): T | null;
	set<T>(key: string, value: T): void;
}

export interface PluginHandle {
	features: PluginFeaturesApi;
	addSettingsToggle(row: PluginSettingsToggle): () => void;
	i18n: PluginI18nApi;
	storage: PluginStorageApi;
}

export interface DiaphantiumPluginApi {
	register(manifest: PluginManifest): PluginHandle | null;
}
