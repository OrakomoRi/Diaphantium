// Centralized configuration key
const CONFIG_KEY = 'Diaphantium.config';

// In-memory cache for faster access
let configCache = null;

// Default configuration structure
const defaultConfig = {
	coordinates: { top: 100, left: 100 },
	clickValues: [],
	clickSuppliesState: false,
	mineDelay: 100,
	antiAfkState: false,
	autoDeleteState: false,
	hotkeys: [],
	showSignature: true
};

// Load config from localStorage (only once)
function loadConfig() {
	if (configCache !== null) return configCache;
	
	try {
		const stored = localStorage.getItem(CONFIG_KEY);
		configCache = stored ? { ...defaultConfig, ...JSON.parse(stored) } : { ...defaultConfig };
	} catch {
		configCache = { ...defaultConfig };
	}
	
	return configCache;
}

// Save entire config to localStorage
function saveConfig() {
	try {
		localStorage.setItem(CONFIG_KEY, JSON.stringify(configCache));
	} catch (e) {
		// Silently ignore storage errors
	}
}

// Debounced save (reduces writes)
let saveTimeout = null;
function debouncedSave() {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(saveConfig, 300);
}

// Get value from config by path (e.g., 'coordinates.top' or just 'mineDelay')
export function getStorage(key) {
	const config = loadConfig();
	
	// Remove 'Diaphantium.' prefix if present for backward compatibility
	const cleanKey = key.replace('Diaphantium.', '');
	
	// Handle nested keys (not used now, but future-proof)
	const keys = cleanKey.split('.');
	let value = config;
	
	for (const k of keys) {
		value = value?.[k];
	}
	
	return value ?? null;
}

// Set value in config by path
export function setStorage(key, value) {
	const config = loadConfig();
	
	// Remove 'Diaphantium.' prefix if present
	const cleanKey = key.replace('Diaphantium.', '');
	
	// Handle nested keys
	const keys = cleanKey.split('.');
	const lastKey = keys.pop();
	
	let target = config;
	for (const k of keys) {
		target[k] = target[k] || {};
		target = target[k];
	}
	
	target[lastKey] = value;
	configCache = config;
	
	// Debounced save to reduce localStorage writes
	debouncedSave();
}

// Batch update - more efficient for multiple changes
export function updateConfig(updates) {
	const config = loadConfig();
	
	Object.entries(updates).forEach(([key, value]) => {
		const cleanKey = key.replace('Diaphantium.', '');
		const keys = cleanKey.split('.');
		const lastKey = keys.pop();
		
		let target = config;
		for (const k of keys) {
			target[k] = target[k] || {};
			target = target[k];
		}
		
		target[lastKey] = value;
	});
	
	configCache = config;
	debouncedSave();
}

// Force immediate save (for critical operations)
export function flushStorage() {
	clearTimeout(saveTimeout);
	saveConfig();
}
