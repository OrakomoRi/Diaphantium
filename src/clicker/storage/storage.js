const CONFIG_KEY = 'Diaphantium.config';

let configCache = null;

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

function saveConfig() {
	try {
		localStorage.setItem(CONFIG_KEY, JSON.stringify(configCache));
	} catch (e) {}
}

let saveTimeout = null;
function debouncedSave() {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(saveConfig, 300);
}

export function getStorage(key) {
	const config = loadConfig();
	
	const cleanKey = key.replace('Diaphantium.', '');
	
	const keys = cleanKey.split('.');
	let value = config;
	
	for (const k of keys) {
		value = value?.[k];
	}
	
	return value ?? null;
}

export function setStorage(key, value) {
	const config = loadConfig();
	
	const cleanKey = key.replace('Diaphantium.', '');
	
	const keys = cleanKey.split('.');
	const lastKey = keys.pop();
	
	let target = config;
	for (const k of keys) {
		target[k] = target[k] || {};
		target = target[k];
	}
	
	target[lastKey] = value;
	configCache = config;
	
	debouncedSave();
}

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

export function flushStorage() {
	clearTimeout(saveTimeout);
	saveConfig();
}
