import { DEFAULT_MINE_DELAY, MAX_MINE_DELAY, MIN_MINE_DELAY } from '../config/config';
import { getStorage, setStorage, type ClickerConfig } from '../storage/storage';
import { DEFAULT_THEME, isThemeId } from '../ui/model/theme';
import { SUPPLY_KEYS } from '../ui/model/supplies';
import { logger } from '../core/logger';
import { runtimeLocales } from './registry';

export const PLUGIN_WRITABLE_KEYS = ['language', 'theme', 'clickValues', 'mineDelay'] as const;
export type PluginWritableKey = typeof PLUGIN_WRITABLE_KEYS[number];

const BUILT_IN_LANGUAGES = ['auto', 'en', 'ru', 'uk'] as const;

function isKnownLanguage(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	return (BUILT_IN_LANGUAGES as readonly string[]).includes(value) || runtimeLocales.has(value);
}

function isClickValues(value: unknown): value is ClickerConfig['clickValues'] {
	if (!Array.isArray(value)) return false;
	const keys = SUPPLY_KEYS as readonly string[];
	return value.every(
		item =>
			item !== null &&
			typeof item === 'object' &&
			keys.includes((item as { key?: unknown }).key as string) &&
			((item as { value?: unknown }).value === 'on' || (item as { value?: unknown }).value === 'off'),
	);
}

function isMineDelay(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= MIN_MINE_DELAY && value <= MAX_MINE_DELAY;
}

const DEFAULTS: { [K in PluginWritableKey]: ClickerConfig[K] } = {
	language: 'auto',
	theme: DEFAULT_THEME,
	clickValues: [],
	mineDelay: DEFAULT_MINE_DELAY,
};

const VALIDATORS: { [K in PluginWritableKey]: (value: unknown) => boolean } = {
	language: isKnownLanguage,
	theme: isThemeId,
	clickValues: isClickValues,
	mineDelay: isMineDelay,
};

export function isPluginWritableKey(key: string): key is PluginWritableKey {
	return (PLUGIN_WRITABLE_KEYS as readonly string[]).includes(key);
}

export function resolvePluginConfig<K extends PluginWritableKey>(key: K): ClickerConfig[K] {
	const stored = getStorage(key);
	return (VALIDATORS[key](stored) ? stored : DEFAULTS[key]) as ClickerConfig[K];
}

export interface PluginConfigApi {
	get<K extends PluginWritableKey>(key: K): ClickerConfig[K];
	set<K extends PluginWritableKey>(key: K, value: ClickerConfig[K]): boolean;
}

export function pluginConfigApi(pluginId: string): PluginConfigApi {
	return {
		get(key) {
			if (!isPluginWritableKey(key)) {
				logger.log(`Plugin "${pluginId}" tried to read config key "${key}", which isn't exposed to plugins`, 'warn');
				return DEFAULTS[key as PluginWritableKey] as ClickerConfig[typeof key];
			}
			return resolvePluginConfig(key);
		},
		set(key, value) {
			if (!isPluginWritableKey(key)) {
				logger.log(`Plugin "${pluginId}" refused - config key "${key}" isn't writable through the plugin API`, 'warn');
				return false;
			}
			if (!VALIDATORS[key](value)) {
				logger.log(`Plugin "${pluginId}" refused an invalid value for config "${key}"`, 'warn');
				return false;
			}
			setStorage(key, value);
			return true;
		},
	};
}
