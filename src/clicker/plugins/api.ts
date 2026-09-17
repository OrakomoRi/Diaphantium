import { watch } from 'vue';
import type Clicker from '../core/Clicker';
import { logger } from '../core/logger';
import { featureStates } from '../core/state';
import { getStorage } from '../storage/storage';
import { addLanguageOption, addSettingsRow, pluginStorage } from './registry';
import type { DiaphantiumPluginApi, PluginHandle, PluginManifest, PluginSettingsToggle } from './types';

const API_VERSION = 1;

export interface I18nHandle {
	mergeLocaleMessage(locale: string, messages: object): void;
	setLocaleMessage(locale: string, messages: object): void;
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
						return getStorage('theme') ?? 'classic';
					},
					language() {
						return getStorage('language') ?? 'auto';
					},
				},
				addSettingsToggle(row: PluginSettingsToggle) {
					if (typeof row?.id !== 'string' || typeof row.label !== 'string' || typeof row.getChecked !== 'function' || typeof row.onChange !== 'function') {
						logger.log(`Plugin "${id}" refused an invalid settings row`, 'warn');
						return () => {};
					}
					return addSettingsRow({
						id: row.id,
						pluginId: id,
						label: row.label,
						hint: row.hint,
						getChecked: () => safeCall(id, `addSettingsToggle(${row.id}).getChecked`, row.getChecked) ?? false,
						onChange: checked => safeCall(id, `addSettingsToggle(${row.id}).onChange`, () => row.onChange(checked)),
					});
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
			};

			return handle;
		},
	};
}
