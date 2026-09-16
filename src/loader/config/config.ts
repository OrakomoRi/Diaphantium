export const CONFIG = {
	SCRIPT_NAME: 'Diaphantium',

	BUILD_VERSION: __DIAPHANTIUM_BUILD__,

	get SCRIPT_VERSION(): string | null {
		return window.__DIAPHANTIUM__?.version || null;
	},

	get DEVELOPMENT_SOURCE(): string | null {
		return window.__DIAPHANTIUM__?.source || null;
	},

	getStableBase(version: string): string {
		return version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/)?.[0] ?? version;
	},

	getBuildFile(version: string, file: string): string {
		return `https://diaphantium-builds.vercel.app/versions/${this.getStableBase(version)}/${version}/${file}`;
	},

	getClickerCDN(version: string): string {
		return this.getBuildFile(version, 'diaphantium.min.js');
	},

	get UPDATE_TOAST_URL(): string {
		return this.getBuildFile(this.BUILD_VERSION, 'update-toast.min.js');
	},

	UPDATE_CHECK_ENABLED: true,
	UPDATE_TOAST_TIMER: 5000,
	STABLE_JSON_URL: (version: string) => `https://diaphantium-builds.vercel.app/stable.json?v=${version}`,
};
