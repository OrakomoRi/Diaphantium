import { getStorage, setStorage, type ClickValue, type ConfigKey } from '../storage/storage';
import { DEFAULT_MINE_DELAY } from '../config/config';
import { featureStates, isSwitchableFeature } from './state';
import { logger } from './logger';
import { afterDelay as scheduleAfterDelay, onTick, TICK_INTERVAL_MS } from './clock';

export type FeatureName = 'supplies' | 'mines' | 'antiAfk' | 'autoDelete';

type Cancel = () => void;
type Schedule = (next: () => void) => Cancel;

interface Feature {
	enabled: boolean;
	storageKey: ConfigKey | null;
	action: () => void;
	schedule: Schedule;
	cancel: Cancel | null;
}

interface ActionProvider {
	pluginId: string;
	action: () => void;
}

const MIN_PRESS_INTERVAL = TICK_INTERVAL_MS;

const NAMED_KEYS: Readonly<Record<string, number>> = {
	ArrowLeft: 37,
	ArrowRight: 39,
	Delete: 46,
};

const keyInits = new Map<string, KeyboardEventInit>();

function keyInit(key: string): KeyboardEventInit {
	let init = keyInits.get(key);
	if (!init) {
		const keyCode = NAMED_KEYS[key] ?? key.charCodeAt(0);
		init = { bubbles: true, cancelable: true, key, code: key in NAMED_KEYS ? key : `Digit${key}`, keyCode, which: keyCode };
		keyInits.set(key, init);
	}
	return init;
}

function dispatchKey(type: 'keydown' | 'keyup', key: string): void {
	document.dispatchEvent(new KeyboardEvent(type, keyInit(key)));
}

function pressKey(key: string): void {
	dispatchKey('keydown', key);
	dispatchKey('keyup', key);
}

function afterDelay(delay: () => number): Schedule {
	return next => scheduleAfterDelay(delay(), next);
}

function atLeastApart(ms: number): Schedule {
	let lastRun = -Infinity;
	return next => {
		const off = onTick(() => {
			const now = performance.now();
			if (now - lastRun < ms) return;
			lastRun = now;
			off();
			next();
		});
		return off;
	};
}

function randomBetween(min: number, max: number): number {
	return min + Math.floor(Math.random() * (max - min + 1));
}

export default class Clicker {
	private antiAfkLeft = true;
	private clickValues: ClickValue[] | null = null;
	private supplyKeys: string[] = [];
	private readonly actionProviders = new Map<FeatureName, ActionProvider>();

	readonly features: Record<FeatureName, Feature> = {
		supplies: {
			enabled: false,
			storageKey: 'clickSuppliesState',
			action: () => this.selectedSupplyKeys().forEach(pressKey),
			schedule: atLeastApart(MIN_PRESS_INTERVAL),
			cancel: null,
		},
		mines: {
			enabled: false,
			storageKey: 'clickMinesState',
			action: () => pressKey('5'),
			schedule: afterDelay(() => getStorage('mineDelay') ?? DEFAULT_MINE_DELAY),
			cancel: null,
		},
		antiAfk: {
			enabled: false,
			storageKey: 'antiAfkState',
			action: () => this.nudge(),
			schedule: afterDelay(() => randomBetween(800, 1500)),
			cancel: null,
		},
		autoDelete: {
			enabled: false,
			storageKey: 'autoDeleteState',
			action: () => pressKey('Delete'),
			schedule: atLeastApart(MIN_PRESS_INTERVAL),
			cancel: null,
		},
	};

	constructor() {
		for (const [name, feature] of Object.entries(this.features) as Array<[FeatureName, Feature]>) {
			if (feature.storageKey && getStorage(feature.storageKey) === true) this.start(name);
		}
	}

	toggle(name: FeatureName): void {
		if (this.features[name].enabled) this.stop(name);
		else this.start(name);
	}

	start(name: FeatureName): void {
		const feature = this.features[name];
		if (feature.enabled) return;
		this.setEnabled(name, true);
		this.run(name, feature);
	}

	stop(name: FeatureName): void {
		const feature = this.features[name];
		if (!feature.enabled) return;
		feature.cancel?.();
		feature.cancel = null;
		this.setEnabled(name, false);
	}

	provideAction(pluginId: string, name: FeatureName, action: () => void): boolean {
		const existing = this.actionProviders.get(name);
		if (existing && existing.pluginId !== pluginId) return false;
		this.actionProviders.set(name, { pluginId, action });
		return true;
	}

	clearAction(pluginId: string, name: FeatureName): void {
		const existing = this.actionProviders.get(name);
		if (existing?.pluginId === pluginId) this.actionProviders.delete(name);
	}

	private run(name: FeatureName, feature: Feature): void {
		const provider = this.actionProviders.get(name);
		try {
			(provider ?? feature).action();
		} catch (e) {
			logger.log(`The action for "${name}" threw and was skipped this tick - ${e}`, 'warn');
		}
		feature.cancel = feature.schedule(() => this.run(name, feature));
	}

	private setEnabled(name: FeatureName, enabled: boolean): void {
		const feature = this.features[name];
		feature.enabled = enabled;
		if (feature.storageKey) setStorage(feature.storageKey, enabled);
		if (isSwitchableFeature(name)) featureStates[name] = enabled;
		logger.log(`${enabled ? 'Started' : 'Stopped'}: ${name}`, 'info');
	}

	private selectedSupplyKeys(): string[] {
		const values = getStorage('clickValues');
		if (values !== this.clickValues) {
			this.clickValues = values;
			this.supplyKeys = (values ?? []).filter(item => item.value === 'on').map(item => item.key);
		}
		return this.supplyKeys;
	}

	private nudge(): void {
		this.antiAfkLeft = !this.antiAfkLeft;
		const key = this.antiAfkLeft ? 'ArrowLeft' : 'ArrowRight';
		dispatchKey('keydown', key);
		setTimeout(() => dispatchKey('keyup', key), randomBetween(50, 100));
	}
}
