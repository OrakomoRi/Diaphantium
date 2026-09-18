import { watch } from 'vue';
import type Clicker from '../core/Clicker';
import { logger } from '../core/logger';
import { featureStates } from '../core/state';
import { pluginConfigApi, resolvePluginConfig } from './config';
import { resolvePluginIcon } from './icon';
import { addLanguageOption, addSettingsRow, addSettingsSection, onLanguageChange, pluginStorage, setPluginLabel } from './registry';
import type { DiaphantiumPluginApi, PluginHandle, PluginManifest, PluginSettingsSection, PluginSettingsToggle } from './types';

const API_VERSION = 1;

export interface I18nHandle {
	locale: { value: string };
	mergeLocaleMessage(locale: string, messages: object): void;
	setLocaleMessage(locale: string, messages: object): void;
	resolveLocale(choice: string): string;
}

interface Deps {
	clicker: Clicker;
	i18n: I18nHandle;
}

function safeCall<T>(pluginId: string, action: string, fn: () => T): T | undefined {
	try {
		return fn();
	} catch (e) {
		logger.log(`Plugin "${pluginId}" threw in ${action} - ${e}`, 'warn');
		return undefined;
	}
}

function isValidManifest(manifest: PluginManifest): boolean {
	return typeof manifest?.id === 'string' && manifest.id.trim() !== '' && manifest.apiVersion === API_VERSION;
}

function isValidRow(row: PluginSettingsToggle): boolean {
	return typeof row?.id === 'string' && typeof row.label === 'string' && typeof row.getChecked === 'function' && typeof row.onChange === 'function';
}

function resolveRow(pluginId: string, row: PluginSettingsToggle) {
	return {
		id: row.id,
		pluginId,
		label: row.label,
		hint: row.hint,
		icon: resolvePluginIcon(row.icon, pluginId),
		getChecked: () => safeCall(pluginId, `addSettingsToggle(${row.id}).getChecked`, row.getChecked) ?? false,
		onChange: (checked: boolean) => safeCall(pluginId, `addSettingsToggle(${row.id}).onChange`, () => row.onChange(checked)),
	};
}

export function createPluginApi({ clicker, i18n }: Deps): DiaphantiumPluginApi {
	return {
		register(manifest) {
			if (typeof manifest?.id !== 'string' || manifest.id.trim() === '') {
				logger.log('Plugin registration refused - missing or empty id', 'warn');
				return null;
			}
			if (!isValidManifest(manifest)) {
				logger.log(`Plugin "${manifest.id}" refused - unsupported apiVersion "${manifest.apiVersion}", this build offers ${API_VERSION}`, 'warn');
				return null;
			}

			const { id } = manifest;
			const baseConfig = pluginConfigApi(id);

			const handle: PluginHandle = {
				features: {
					isEnabled(name) {
						return featureStates[name];
					},
					onChange(name, fn) {
						return watch(
							() => featureStates[name],
							enabled => safeCall(id, `features.onChange(${name})`, () => fn(enabled)),
						);
					},
					provideAction(name, action) {
						const accepted = clicker.provideAction(id, name, action);
						if (!accepted) {
							logger.log(`Plugin "${id}" refused - "${name}" already has an action provider`, 'warn');
							return () => {};
						}
						return () => clicker.clearAction(id, name);
					},
					theme() {
						return resolvePluginConfig('theme');
					},
					language() {
						return i18n.locale.value;
					},
					onLanguageChange(fn) {
						return onLanguageChange(locale => safeCall(id, 'features.onLanguageChange', () => fn(locale)));
					},
				},
				addSettingsToggle(row: PluginSettingsToggle) {
					if (!isValidRow(row)) {
						logger.log(`Plugin "${id}" refused an invalid settings row`, 'warn');
						return () => {};
					}
					return addSettingsRow(resolveRow(id, row));
				},
				addSettingsSection(section: PluginSettingsSection) {
					if (typeof section?.id !== 'string' || typeof section.title !== 'string' || !Array.isArray(section.rows) || !section.rows.every(isValidRow)) {
						logger.log(`Plugin "${id}" refused an invalid settings section`, 'warn');
						return () => {};
					}
					return addSettingsSection({
						id: section.id,
						pluginId: id,
						title: section.title,
						icon: resolvePluginIcon(section.icon, id),
						rows: section.rows.map(row => resolveRow(id, row)),
					});
				},
				setLabel(label: string) {
					if (typeof label !== 'string' || label.trim() === '') {
						logger.log(`Plugin "${id}" refused setLabel - empty label`, 'warn');
						return;
					}
					safeCall(id, 'setLabel', () => setPluginLabel(id, label));
				},
				i18n: {
					addTranslations(locale, messages) {
						safeCall(id, 'i18n.addTranslations', () => i18n.mergeLocaleMessage(locale, { plugins: { [id]: messages } }));
					},
					addLanguage(option, messages) {
						addLanguageOption(option);
						safeCall(id, 'i18n.addLanguage', () => i18n.setLocaleMessage(option.id, { plugins: { [id]: messages } }));
					},
				},
				storage: pluginStorage(id),
				config: {
					get: baseConfig.get,
					set(key, value) {
						const applied = baseConfig.set(key, value);
						if (applied && key === 'language') i18n.locale.value = i18n.resolveLocale(value as string);
						return applied;
					},
				},
			};

			return handle;
		},
	};
}
