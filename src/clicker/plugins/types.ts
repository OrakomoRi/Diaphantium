import type { FeatureName } from '../core/Clicker';
import type { PluginConfigApi } from './config';
import type { PluginIcon } from './icon';

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
	onLanguageChange(fn: (locale: string) => void): () => void;
}

export interface PluginSettingsToggle {
	id: string;
	label: string;
	hint?: string;
	icon?: PluginIcon;
	getChecked: () => boolean;
	onChange: (checked: boolean) => void;
}

export interface PluginSettingsSection {
	id: string;
	title: string;
	icon?: PluginIcon;
	rows: PluginSettingsToggle[];
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
	addSettingsSection(section: PluginSettingsSection): () => void;
	setLabel(label: string): void;
	i18n: PluginI18nApi;
	storage: PluginStorageApi;
	config: PluginConfigApi;
}

export interface DiaphantiumPluginApi {
	register(manifest: PluginManifest): PluginHandle | null;
}
