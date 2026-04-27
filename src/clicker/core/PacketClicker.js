export default class PacketClicker {
	constructor() {
		this.SUPPLY_TYPES = {
			FIRST_AID: '1',
			DOUBLE_ARMOR: '2',
			DOUBLE_DAMAGE: '3',
			NITRO: '4',
			MINE: '5'
		};

		this.SIMPLE_NAMES = [
			{
				name: 'ConfigureSupplyMessage',
				regex: /ConfigureSupplyMessage\(type=.+?this\.(\w+)(?:\.toString\(\))?\s*\+.+?count=.+?this\.(\w+)/,
				index: 2,
			},
			{
				name: 'StopCooldownMessage',
				regex: /StopCooldownMessage\(supplyType=.+?this\.(\w+)(?:\.toString\(\))?/,
				index: 1,
			}
		];

		this.variables = { ConfigureSupplyMessage: null, StopCooldownMessage: null };
		this.supplies = [];
		this.cooldowns = new Map(
			Object.keys(this.SUPPLY_TYPES).map(type => [type, false])
		);
		this.intervals = {};
		this.hooksInstalled = false;

		this.tankState = null;
		this.subscribeMethod = null;

		this.init();
	}

	async init() {
		if (this.hooksInstalled) return true;

		const scriptContent = await this.fetchGameScript();
		if (!scriptContent) return false;

		this.extractVariableNames(scriptContent);

		if (Object.values(this.variables).some(v => v === null)) return false;

		this.installHooks();
		this.hooksInstalled = true;
		return true;
	}

	async fetchGameScript() {
		const findScript = () => [...document.scripts].find(s => s.src?.includes('/static/js/'));

		let scriptTag = findScript();
		if (!scriptTag) {
			const timeout = Date.now() + 5000;

			await new Promise(resolve => {
				new MutationObserver((_, observer) => {
					scriptTag = findScript();
					if (scriptTag || Date.now() > timeout) {
						observer.disconnect();
						resolve(null);
					}
				}).observe(document, { childList: true, subtree: true });
			});
		}

		try {
			const response = await fetch(scriptTag.src);
			return await response.text();
		} catch {
			return null;
		}
	}

	extractVariableNames(scriptContent) {
		for (const { name, regex, index } of this.SIMPLE_NAMES) {
			const match = scriptContent.match(regex);
			this.variables[name] = match?.[index] ?? null;
		}
		this.subscribeMethod = this.findSubscribeMethod(scriptContent);
	}

	findSubscribeMethod(scriptContent) {
		const counts = {};
		for (const m of scriptContent.matchAll(/\.(\w+)\s*\(\s*\w+\s*\(\s*\w+\s*\)\s*,\s*-?\d+\s*,\s*!(?:0|1)/g))
			counts[m[1]] = (counts[m[1]] || 0) + 1;
		return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
	}

	installHooks() {
		if (this.subscribeMethod)
			this.hookTankStateEvent(this.subscribeMethod);

		this.hookVariableTracking(
			this.variables.ConfigureSupplyMessage,
			(obj) => {
				if (!this.supplies.includes(obj)) {
					const type = this.findSupplyType(obj);
					if (type) {
						this.supplies.push(obj);
					}
				}
			}
		);

		this.hookVariableTracking(
			this.variables.StopCooldownMessage,
			(obj, val) => {
				let type = null;

				if (val && typeof val === 'object') {
					for (const key in val) {
						if (typeof val[key] === 'string' && Object.keys(this.SUPPLY_TYPES).includes(val[key])) {
							type = val[key];
							break;
						}
					}

					if (!type) {
						type = this.findSupplyType(val);
					}
				}

				if (type) {
					this.cooldowns.set(type, false);
				}
			}
		);
	}

	hookTankStateEvent(subMethod) {
		const self = this;
		const TANK_STATES = new Set(['ACTIVE', 'SEMI_ACTIVE', 'DEAD_PHANTOM', 'DEAD']);
		const k = `__${subMethod}`;

		Object.defineProperty(Object.prototype, subMethod, {
			get() { return this[k]; },
			set(fn) {
				if (!fn || typeof fn !== 'function') { this[k] = fn; return; }
				if (fn.__pckWrapped) { this[k] = fn; return; }

				const wrapped = function (eventType, priority, flag, handler) {
					const origHandler = handler ?? (() => {});
					const h = function () {
						const event = arguments[0];
						if (event && typeof event === 'object') {
							try {
								const str = event.toString?.();
								if (str?.startsWith('onChangedClientTankState')) {
									for (const val of Object.values(event)) {
										if (typeof val === 'string' && TANK_STATES.has(val)) {
											self.tankState = val;
											console.log('[PacketClicker] Tank state:', val);
											break;
										}
										if (val && typeof val === 'object') {
											const name = val.name_ ?? val.toString?.();
											if (typeof name === 'string' && TANK_STATES.has(name)) {
												self.tankState = name;
												console.log('[PacketClicker] Tank state:', name);
												break;
											}
										}
									}
								}
							} catch {}
						}
						return origHandler.apply(this, arguments);
					};
					if (handler) {
						h.__callableName = handler.__callableName;
						try { Object.setPrototypeOf(h, Object.getPrototypeOf(handler)); } catch {}
					}
					return fn.call(this, eventType, priority, flag, h);
				};
				wrapped.__pckWrapped = true;
				this[k] = wrapped;
			},
			configurable: true,
		});
	}

	hookVariableTracking(name, handler) {
		Object.defineProperty(Object.prototype, name, {
			get() {
				return this[`__${name}`]
			},
			set(value) {
				this[`__${name}`] = value;

				handler(this, value);
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

			if (/^[A-Z_]+$/.test(value) && Object.keys(this.SUPPLY_TYPES).includes(value)) {
				return value;
			}

			if (typeof value === 'object') {
				const result = this.findSupplyType(value, seen);
				if (result) return result;
			}
		}

		return null;
	}

	clickSupply(supplyTypeOrKey) {
		const supplyType = Object.keys(this.SUPPLY_TYPES).includes(supplyTypeOrKey)
			? supplyTypeOrKey
			: Object.keys(this.SUPPLY_TYPES).find(k => this.SUPPLY_TYPES[k] === supplyTypeOrKey);

		if (!supplyType) return false;

		this.supplies = this.supplies.filter(obj =>
			Object.values(obj).some(v => typeof v === 'function')
		);

		for (let i = this.supplies.length - 1; i >= 0; i--) {
			const obj = this.supplies[i];
			if (this.findSupplyType(obj) === supplyType) {
				const funcs = Object.values(obj).filter(v => typeof v === 'function');
				if (funcs.length >= 1) {
					funcs[0]();
					return true;
				}
			}
		}

		return false;
	}

	startClicker(mineDelay = 500) {
		this.stopClicker();

		for (const type of Object.keys(this.SUPPLY_TYPES)) {
			const delay = type === 'MINE' ? mineDelay : 100;
			this.intervals[type] = setInterval(() => this.clickSupply(type), delay);
		}
	}

	stopClicker() {
		for (const interval of Object.values(this.intervals)) {
			clearInterval(interval);
		}
		this.intervals = {};
	}
}
