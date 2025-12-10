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

		// Expose to window for debugging
		if (typeof window !== 'undefined') {
			window.debugPacketClicker = this.getDebugInfo.bind(this);
			window.packetClicker = this;
		}

		this.init();
	}

	// Debug function accessible from console
	getDebugInfo() {
		const info = {
			variableNames: this.variableNames,
			registeredSupplies: Object.keys(this.supplies),
			cooldowns: Array.from(this.cooldowns),
			fullObjectsCount: this.fullObjects.length,
			fullObjects: this.fullObjects.map(obj => {
				const name = this.findNameKey(obj);
				const funcs = Object.values(obj).filter(v => typeof v === 'function');
				return {
					supplyType: name?.value || 'unknown',
					functionCount: funcs.length,
					keys: Object.keys(obj).filter(k => !k.startsWith('__'))
				};
			})
		};

		console.log('=== PacketClicker Debug Info ===');
		console.log('Variable Names:', info.variableNames);
		console.log('Registered Supplies:', info.registeredSupplies);
		console.log('Active Cooldowns:', info.cooldowns);
		console.log('Total Objects:', info.fullObjectsCount);
		console.log('Objects Details:', info.fullObjects);
		console.log('================================');
		
		return info;
	}

	async init() {
		const script = await this.fetchGameScript();
		if (!script) {
			console.error('[PacketClicker] Failed to fetch game script');
			return false;
		}

		this.variableNames.supply = this.extractVariableName(script, 'ConfigureSupplyMessage');
		this.variableNames.cooldown = this.extractVariableName(script, 'StopCooldownMessage');

		if (!this.variableNames.supply || !this.variableNames.cooldown) {
			console.error('[PacketClicker] Failed to extract variable names');
			return false;
		}

		console.log('[PacketClicker] Variable names:', this.variableNames);
		this.hookSupplyObjects();
		this.hookCooldownTracking();
		return true;
	}

	async fetchGameScript() {
		try {
			const scriptTag = [...document.scripts].find(s => s.src?.includes('/play/static/js/'));
			if (!scriptTag) {
				console.warn('[PacketClicker] Script tag not found, retrying...');
				await new Promise(resolve => setTimeout(resolve, 100));
				return this.fetchGameScript();
			}

			const response = await fetch(scriptTag.src);
			if (!response.ok) throw new Error('Failed to fetch');

			return await response.text();
		} catch (error) {
			console.error('[PacketClicker] Fetch error:', error);
			return null;
		}
	}

	extractVariableName(script, messageType) {
		let pattern;
		if (messageType === 'ConfigureSupplyMessage') {
			// Pattern with toString: ConfigureSupplyMessage(type=" + this.oy7_1.toString() + ", count=" + this.py7_1 + "
			// Pattern without toString: ConfigureSupplyMessage(type=" + this.jy4_1 + ", count=" + this.ky4_1 + "
			pattern = /ConfigureSupplyMessage\(type=.+?this\.(\w+)(?:\.toString\(\))?\s*\+.+?count=.+?this\.(\w+)/;
			const match = script.match(pattern);
			if (match) {
				console.log('[PacketClicker] Found ConfigureSupplyMessage variables:', match[1], match[2]);
				// Return the second variable (count parameter)
				return match[2];
			}
		} else if (messageType === 'StopCooldownMessage') {
			// Pattern with toString: StopCooldownMessage(supplyType=" + this.cyf_1.toString() + ")"
			// Pattern without toString: StopCooldownMessage(supplyType=" + this.xyb_1 + ")"
			pattern = /StopCooldownMessage\(supplyType=.+?this\.(\w+)(?:\.toString\(\))?/;
			const match = script.match(pattern);
			if (match) {
				console.log('[PacketClicker] Found StopCooldownMessage variable:', match[1]);
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
						console.log(`[PacketClicker] Registered supply: ${supplyType}`);
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
					// When StopCooldownMessage is sent, the supply is ready (cooldown ended)
					self.cooldowns.delete(supplyType);
					console.log(`[PacketClicker] Cooldown ended for: ${supplyType}`);
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

		if (!supplyType) {
			console.warn('[PacketClicker] Unknown supply key:', key);
			return;
		}

		if (!this.supplies[supplyType]) {
			console.warn('[PacketClicker] Supply not registered yet:', supplyType);
			return;
		}

		// Mines don't have cooldown restrictions
		if (supplyType === 'MINE') {
			console.log('[PacketClicker] Clicking MINE');
			this.supplies[supplyType]();
			return;
		}

		// For other supplies, check cooldown
		if (this.cooldowns.has(supplyType)) {
			console.log('[PacketClicker] Supply on cooldown:', supplyType);
			return; // Supply is on cooldown
		}

		console.log('[PacketClicker] Clicking supply:', supplyType);
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
