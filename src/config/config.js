export const CONFIG = {
	SCRIPT_NAME: 'Diaphantium',

	get SCRIPT_VERSION() {
		return window.__DIAPHANTIUM__?.version || null;
	},

	getStableBase(version) {
		return version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/)?.[0] ?? version;
	},

	getClickerCDN(version) {
		const base = this.getStableBase(version);
		return `https://diaphantium-builds.vercel.app/versions/${base}/${version}/diaphantium.min.js`;
	},

	UPDATE_CHECK_ENABLED: true,
	UPDATE_MODAL_TIMER: 5000,
	GITHUB_SCRIPT_URL: (v) => `https://orakomori.github.io/Diaphantium/release/diaphantium.user.js?v=${v}`,
	STABLE_JSON_URL: (v) => `https://diaphantium-builds.vercel.app/stable.json?v=${v}`,
};
