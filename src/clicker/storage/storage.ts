import { NAME, DEFAULT_MINE_DELAY } from '../config/config';
import type { Anchor } from '../core/position';

export interface Coordinates {
	top: number;
	left: number;
	anchor?: Anchor;
}

export interface ClickValue {
	key: string;
	value: string;
}

export interface Hotkey {
	action: string;
	value: string;
}

export interface ClickerConfig {
	coordinates: Coordinates;
	clickValues: ClickValue[];
	clickSuppliesState: boolean;
	clickMinesState: boolean;
	mineDelay: number;
	antiAfkState: boolean;
	autoDeleteState: boolean;
	hotkeys: Hotkey[];
	showSignature: boolean;
	theme: string;
	language: string;
}

export type ConfigKey = keyof ClickerConfig;

const CONFIG_KEY = `${NAME}.config`;
const SAVE_DELAY = 300;

const defaultConfig: ClickerConfig = {
	coordinates: { top: 100, left: 100 },
	clickValues: [],
	clickSuppliesState: false,
	clickMinesState: false,
	mineDelay: DEFAULT_MINE_DELAY,
	antiAfkState: false,
	autoDeleteState: false,
	hotkeys: [],
	showSignature: true,
	theme: 'classic',
	language: 'auto',
};

let config: ClickerConfig | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function loadConfig(): ClickerConfig {
	if (config) return config;
	try {
		const stored = localStorage.getItem(CONFIG_KEY);
		config = stored ? { ...defaultConfig, ...JSON.parse(stored) } : { ...defaultConfig };
	} catch {
		config = { ...defaultConfig };
	}
	return config as ClickerConfig;
}

function saveConfig(): void {
	clearTimeout(saveTimer);
	saveTimer = undefined;
	window.removeEventListener('pagehide', saveConfig);
	try {
		localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
	} catch {}
}

export function getStorage<K extends ConfigKey>(key: K): ClickerConfig[K] | null {
	return loadConfig()[key] ?? null;
}

export function setStorage<K extends ConfigKey>(key: K, value: ClickerConfig[K]): void {
	loadConfig()[key] = value;
	if (saveTimer === undefined) window.addEventListener('pagehide', saveConfig, { once: true });
	clearTimeout(saveTimer);
	saveTimer = setTimeout(saveConfig, SAVE_DELAY);
}
