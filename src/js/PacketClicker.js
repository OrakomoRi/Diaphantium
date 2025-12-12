export default class PacketClicker {
	constructor() {
		this.supplyObjects = new Map();
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
		if (!script) return false;

		this.variableNames.supply = this.extractVariableName(script, 'ConfigureSupplyMessage');
		this.variableNames.cooldown = this.extractVariableName(script, 'StopCooldownMessage');

		if (!this.variableNames.supply || !this.variableNames.cooldown) return false;

		if (!this.hooksInstalled) {
			this.installHooks();
			this.hooksInstalled = true;
		}

		return true;
	}

	reset() {
		this.supplyObjects.clear();
		this.cooldowns.clear();
		this.log('reset', 'State cleared for new battle');
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
		const info = {
			variableNames: this.variableNames,
			registeredSupplies: Array.from(this.supplyObjects.keys()),
			activeCooldowns: Array.from(this.cooldowns),
			recentEvents: this.debugHistory.slice(-10)
		};
		
		console.table(info.recentEvents);
		console.log('Variables:', info.variableNames);
		console.log('Registered:', info.registeredSupplies.join(', '));
		console.log('Cooldowns:', info.activeCooldowns.join(', '));
		
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
	}	extractVariableName(script, messageType) {
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

				const supplyType = self.findSupplyType(this);
				if (supplyType) {
					const funcCount = Object.values(this).filter(v => typeof v === 'function').length;
					self.supplyObjects.set(supplyType, this);
					self.log('register', `${supplyType} (${funcCount} functions)`);
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
				const supplyType = self.findSupplyType(this);
				if (supplyType) {
					self.cooldowns.delete(supplyType);
					self.log('cooldown-end', supplyType);
				}
			},
			configurable: true
		});
	}

	findSupplyType(obj) {
		for (const key in obj) {
			const value = obj[key];
			if (typeof value === 'string' && /^[A-Z_]+$/.test(value)) {
				return value;
			}
		}
		return null;
	}

	clickSupply(key) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).find(k => this.SUPPLY_TYPES[k] === key);
		if (!supplyType) {
			this.log('click-fail', `Unknown key: ${key}`);
			return;
		}

		const obj = this.supplyObjects.get(supplyType);
		if (!obj) {
			this.log('click-fail', `${supplyType} not registered`);
			return;
		}

		const func = Object.values(obj).find(v => typeof v === 'function');
		if (!func) {
			this.log('click-fail', `${supplyType} no function`);
			return;
		}

		if (supplyType === 'MINE' || !this.cooldowns.has(supplyType)) {
			func.call(obj);
			if (supplyType !== 'MINE') this.cooldowns.add(supplyType);
			this.log('click', supplyType);
		} else {
			this.log('click-skip', `${supplyType} on cooldown`);
		}
	}

	isReady(key) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).find(k => this.SUPPLY_TYPES[k] === key);
		return supplyType ? (supplyType === 'MINE' || !this.cooldowns.has(supplyType)) : false;
	}
}
