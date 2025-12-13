export default class PacketClicker {
	constructor() {
		this.fullObjects = [];
		this.cooldowns = new Set();
		this.variableNames = { supply: null, cooldown: null };
		this.hooksInstalled = false;
		this.debugHistory = [];

		this.SUPPLY_TYPES = {
			FIRST_AID: '1',
			DOUBLE_ARMOR: '2',
			DOUBLE_DAMAGE: '3',
			NITRO: '4',
			MINE: '5'
		};

		if (typeof window !== 'undefined') {
			window.packetClickerDebug = () => this.showDebug();
		}

		this.init();
	}

	async init() {
		const script = await this.fetchGameScript();
		if (!script) {
			this.log('init-fail', 'Script not found');
			return false;
		}

		this.variableNames.supply = this.extractVariableName(script, 'ConfigureSupplyMessage');
		this.variableNames.cooldown = this.extractVariableName(script, 'StopCooldownMessage');

		this.log('init', `Variables: supply=${this.variableNames.supply}, cooldown=${this.variableNames.cooldown}`);

		if (!this.variableNames.supply || !this.variableNames.cooldown) {
			this.log('init-fail', 'Variables not extracted');
			return false;
		}

		if (!this.hooksInstalled) {
			this.installHooks();
			this.hooksInstalled = true;
			this.log('hooks', 'Installed successfully');
		}

		return true;
	}

	log(event, data) {
		this.debugHistory.push({
			time: new Date().toLocaleTimeString(),
			event,
			data
		});
		if (this.debugHistory.length > 50) {
			this.debugHistory.shift();
		}
	}

	showDebug() {
		const supplyTypes = this.fullObjects.map(obj => this.findSupplyType(obj)).filter(Boolean);
		
		const info = {
			initialized: this.hooksInstalled,
			variableNames: this.variableNames,
			objectCount: this.fullObjects.length,
			uniqueSupplies: [...new Set(supplyTypes)],
			activeCooldowns: Array.from(this.cooldowns),
			recentEvents: this.debugHistory.slice(-15)
		};
		
		console.table(info.recentEvents);
		console.log('Initialized:', info.initialized);
		console.log('Variables:', info.variableNames);
		console.log('Total objects:', info.objectCount);
		console.log('Supplies:', info.uniqueSupplies.join(', ') || 'NONE');
		console.log('Cooldowns:', info.activeCooldowns.join(', ') || 'NONE');
		
		return info;
	}

	async fetchGameScript() {
		const findScript = () => [...document.scripts].find(s => s.src?.includes('/static/js/'));
		
		let scriptTag = findScript();
		if (!scriptTag) {
			await new Promise(resolve => setTimeout(resolve, 100));
			scriptTag = findScript();
			if (!scriptTag) return null;
		}

		try {
			const response = await fetch(scriptTag.src);
			return response.ok ? await response.text() : null;
		} catch {
			return null;
		}
	}

	extractVariableName(script, messageType) {
		const patterns = {
			ConfigureSupplyMessage: /ConfigureSupplyMessage\(type=.+?this\.(\w+)(?:\.toString\(\))?\s*\+.+?count=.+?this\.(\w+)/,
			StopCooldownMessage: /StopCooldownMessage\(supplyType=.+?this\.(\w+)(?:\.toString\(\))?/
		};

		const match = script.match(patterns[messageType]);
		return match ? match[messageType === 'ConfigureSupplyMessage' ? 2 : 1] : null;
	}

	installHooks() {
		this.hookSupplyRegistration();
		this.hookCooldownTracking();
	}

	hookSupplyRegistration() {
		const self = this;
		const propertyName = this.variableNames.supply;

		Object.defineProperty(Object.prototype, propertyName, {
			get() { return this[`__${propertyName}`]; },
			set(value) {
				this[`__${propertyName}`] = value;

				if (!self.fullObjects.includes(this)) {
					self.fullObjects.push(this);
					
					const supplyType = self.findSupplyType(this);
					if (supplyType) {
						const funcCount = Object.values(this).filter(v => typeof v === 'function').length;
						self.log('register', `${supplyType} (${funcCount} functions)`);
					}
				}
			},
			configurable: true
		});
	}

	hookCooldownTracking() {
		const self = this;
		const propertyName = this.variableNames.cooldown;

		Object.defineProperty(Object.prototype, propertyName, {
			get() { return this[`__${propertyName}`]; },
			set(value) {
				this[`__${propertyName}`] = value;
				
				self.log('cooldown-message', JSON.stringify(value).substring(0, 100));
				
				let supplyType = null;
				
				if (value && typeof value === 'object') {
					for (const key in value) {
						if (typeof value[key] === 'string' && /^[A-Z_]+$/.test(value[key])) {
							supplyType = value[key];
							self.log('cooldown-supply-found', `${key}: ${supplyType}`);
							break;
						}
					}
					
					if (!supplyType) {
						supplyType = self.findSupplyType(value);
						if (supplyType) {
							self.log('cooldown-supply-recursive', supplyType);
						}
					}
				}
				
				if (supplyType) {
					self.cooldowns.delete(supplyType);
					self.log('cooldown-end', supplyType);
				} else {
					self.log('cooldown-no-type', 'Supply type not found');
				}
			},
			configurable: true
		});
	}

	findSupplyType(obj, seen = new WeakSet()) {
		if (!obj || typeof obj !== 'object') return null;
		if (seen.has(obj)) return null;
		seen.add(obj);

		for (const key of Object.keys(obj)) {
			const value = obj[key];

			if (typeof value === 'string' && /^[A-Z_]+$/.test(value)) {
				return value;
			}

			if (typeof value === 'object') {
				const result = this.findSupplyType(value, seen);
				if (result) return result;
			}
		}

		return null;
	}

	clickSupply(key) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).find(k => this.SUPPLY_TYPES[k] === key);
		if (!supplyType) return;

		// Clean up duplicates if object count is too high
		if (this.fullObjects.length > 35) {
			const before = this.fullObjects.length;
			// Keep only last 28 objects (fresh ones)
			this.fullObjects = this.fullObjects.slice(-28);
			this.cooldowns.clear();
			this.log('cleanup', `Trimmed ${before - this.fullObjects.length} old objects, cleared cooldowns`);
		}

		// MINE has no cooldown
		if (supplyType !== 'MINE' && this.cooldowns.has(supplyType)) {
			this.log('click-skip', `${supplyType} on cooldown`);
			return;
		}

		// Find current object with this supply type
		for (const obj of this.fullObjects) {
			const objType = this.findSupplyType(obj);
			if (objType === supplyType) {
				const funcs = Object.values(obj).filter(v => typeof v === 'function');
				if (funcs.length >= 1) {
					funcs[0]();
					if (supplyType !== 'MINE') {
						this.cooldowns.add(supplyType);
					}
					this.log('click', supplyType);
					return;
				}
			}
		}
		
		// Not found - might be stale cooldown, clear it
		if (this.cooldowns.has(supplyType)) {
			this.cooldowns.delete(supplyType);
			this.log('cooldown-clear', `${supplyType} not found, cleared cooldown`);
		}
		
		this.log('click-fail', `${supplyType} not found`);
	}

	isReady(key) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).find(k => this.SUPPLY_TYPES[k] === key);
		return supplyType ? (supplyType === 'MINE' || !this.cooldowns.has(supplyType)) : false;
	}
}