export default class PacketClicker {
	constructor() {
		this.supplies = {};
		this.cooldowns = new Set();
		this.variableNames = {
			supply: null,
			cooldown: null
		};
		this.fullObjects = [];

		this.SUPPLY_TYPES = {
			FIRST_AID: '1',
			DOUBLE_ARMOR: '2',
			DOUBLE_DAMAGE: '3',
			NITRO: '4',
			MINE: '5'
		};

		this.init();
	}

	async init() {
		const script = await this.fetchGameScript();
		if (!script) {
			return false;
		}

		this.variableNames.supply = this.extractVariableName(script, 'ConfigureSupplyMessage');
		this.variableNames.cooldown = this.extractVariableName(script, 'StopCooldownMessage');

		if (!this.variableNames.supply || !this.variableNames.cooldown) {
			return false;
		}

		this.hookSupplyObjects();
		this.hookCooldownTracking();
		return true;
	}

	async fetchGameScript() {
		try {
			// Try multiple patterns for different server configurations
			const patterns = [
				s => s.src?.includes('/static/js/'),
			];
			
			let scriptTag = null;
			for (const pattern of patterns) {
				scriptTag = [...document.scripts].find(pattern);
				if (scriptTag) break;
			}
			
			if (!scriptTag) {
				await new Promise(resolve => setTimeout(resolve, 100));
				return this.fetchGameScript();
			}

			const response = await fetch(scriptTag.src);
			if (!response.ok) throw new Error('Failed to fetch');
			
			return await response.text();
		} catch (error) {
			return null;
		}
	}	extractVariableName(script, messageType) {
		let pattern;
		if (messageType === 'ConfigureSupplyMessage') {
			// Pattern with toString: ConfigureSupplyMessage(type=" + this.oy7_1.toString() + ", count=" + this.py7_1 + "
			// Pattern without toString: ConfigureSupplyMessage(type=" + this.jy4_1 + ", count=" + this.ky4_1 + "
			pattern = /ConfigureSupplyMessage\(type=.+?this\.(\w+)(?:\.toString\(\))?\s*\+.+?count=.+?this\.(\w+)/;
			const match = script.match(pattern);
			if (match) {
				return match[2];
			}
		} else if (messageType === 'StopCooldownMessage') {
			// Pattern with toString: StopCooldownMessage(supplyType=" + this.cyf_1.toString() + ")"
			// Pattern without toString: StopCooldownMessage(supplyType=" + this.xyb_1 + ")"
			pattern = /StopCooldownMessage\(supplyType=.+?this\.(\w+)(?:\.toString\(\))?/;
			const match = script.match(pattern);
			if (match) {
				return match[1];
			}
		}

		return null;
	}

	hookSupplyObjects() {
		const self = this;
		const propertyName = this.variableNames.supply;

		Object.defineProperty(Object.prototype, propertyName, {
			get: function () {
				return this[`__${propertyName}`];
			},
			set: function (value) {
				this[`__${propertyName}`] = value;

				if (!self.fullObjects.includes(this)) {
					self.fullObjects.push(this);
				}

				const nameData = self.findNameKey(this);
				if (nameData) {
					const supplyType = nameData.value;

					if (!self.supplies[supplyType]) {
						self.supplies[supplyType] = () => {
							self.fullObjects.forEach(obj => {
								const n = self.findNameKey(obj);
								if (n && n.value === supplyType) {
									const funcs = Object.values(obj).filter(v => typeof v === 'function');
									if (funcs.length === 1) {
										funcs[0]();
									}
								}
							});
						};
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
			get: function () {
				return this[`__${propertyName}`];
			},
			set: function (value) {
				this[`__${propertyName}`] = value;

				const nameData = self.findNameKey(this);
				if (nameData) {
					const supplyType = nameData.value;
					self.cooldowns.delete(supplyType);
				}
			},
			configurable: true
		});
	}

	findNameKey(obj, seen = new WeakSet()) {
		if (!obj || typeof obj !== 'object') return null;
		if (seen.has(obj)) return null;
		seen.add(obj);

		for (const key of Object.keys(obj)) {
			const value = obj[key];

			if (typeof value === 'string' && value.match(/^[A-Z_]+$/)) {
				return { key, value };
			}

			if (typeof value === 'object') {
				const result = this.findNameKey(value, seen);
				if (result) return result;
			}
		}

		return null;
	}

	clickSupply(key) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).find(
			type => this.SUPPLY_TYPES[type] === key
		);

		if (!supplyType) return;
		if (!this.supplies[supplyType]) return;

		// Mines don't have cooldown restrictions
		if (supplyType === 'MINE') {
			this.supplies[supplyType]();
			return;
		}

		// For other supplies, check cooldown
		if (this.cooldowns.has(supplyType)) return;

		this.supplies[supplyType]();
		this.cooldowns.add(supplyType);
	}

	isReady(key) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).find(
			type => this.SUPPLY_TYPES[type] === key
		);

		if (!supplyType) return false;
		if (supplyType === 'MINE') return true; // Mines are always ready

		return !this.cooldowns.has(supplyType);
	}
}
