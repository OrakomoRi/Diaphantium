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
			},
			{
				name: 'TankState',
				regex: /callableName\s*=\s*["']onChangedClientTankState["'][\s\S]{0,500}?\([\w$]+=[\w$]+\)\.(\w+)\.equals\([\w$]+\(\)\)/,
				index: 1,
			},
		];

		this.variables = { ConfigureSupplyMessage: null, StopCooldownMessage: null, TankState: null };
		this.supplies = [];
		this.cooldowns = new Map(
			Object.keys(this.SUPPLY_TYPES).map(type => [type, false])
		);
		this.intervals = {};
		this.hooksInstalled = false;

		this.init();
	}

	async init() {
		if (this.hooksInstalled) return true;

		const cached = this.loadVariableCache();
		if (cached) {
			Object.assign(this.variables, cached);
			if (!Object.values(this.variables).some(v => v === null)) {
				this.installHooks();
				this.hooksInstalled = true;
				console.log('[PacketClicker] hooks installed from cache:', this.variables);
			}
		}

		const scriptContent = await this.fetchGameScript();
		if (!scriptContent) return this.hooksInstalled;

		this.extractVariableNames(scriptContent);
		console.log('[PacketClicker] variables after parse:', this.variables);
		this.saveVariableCache();

		if (!this.hooksInstalled) {
			if (Object.values(this.variables).some(v => v === null)) return false;
			this.installHooks();
			this.hooksInstalled = true;
		}

		return true;
	}

	loadVariableCache() {
		try {
			const raw = localStorage.getItem('PacketClicker_vars');
			return raw ? JSON.parse(raw) : null;
		} catch { return null; }
	}

	saveVariableCache() {
		try {
			localStorage.setItem('PacketClicker_vars', JSON.stringify(this.variables));
		} catch {}
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
	}

	installHooks() {
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
			this.variables.TankState,
			(obj, val) => {
				this.onTankStateChange(obj, val);
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

	onTankStateChange(obj, val) {
		console.log('[TankState] changed:', val);
	}

	hookMethodCall(name, handler) {
		Object.defineProperty(Object.prototype, name, {
			get() {
				return this[`__${name}`];
			},
			set(value) {
				if (typeof value === 'function') {
					const original = value;
					const outerHandler = handler;
					const self = this;
					this[`__${name}`] = function(...args) {
						outerHandler(self, args);
						return original.apply(this, args);
					};
				} else {
					this[`__${name}`] = value;
				}
			},
			configurable: true
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
