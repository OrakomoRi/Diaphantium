import { Bridge } from './Bridge.js';
import { CONFIG } from '../config/config.js';
import { compareVersions } from '../libs/loader/compareversions.min.js';

export class UpdateChecker {
	constructor(logger) {
		this.logger = logger;
	}

	async check() {
		const version = CONFIG.SCRIPT_VERSION;
		if (!version) return;

		let data;
		try {
			data = await Bridge.fetch(CONFIG.GITHUB_SCRIPT_URL(version));
		} catch (err) {
			this.logger?.log(`Failed to check for updates: ${err}`, 'error');
			return;
		}

		const match = data.match(/@version\s+([\w.+-]+)/);
		if (!match) {
			this.logger?.log('Unable to extract version from the GitHub script.', 'error');
			return;
		}

		const githubVersion = match[1];
		const compareResult = compareVersions(githubVersion, version);

		this.logger?.logVersionComparison?.(compareResult, version, githubVersion);

		if (compareResult === 1) {
			await this._findLatestStable(version);
		}
	}

	async _findLatestStable(version) {
		try {
			const stableData = await Bridge.fetch(CONFIG.STABLE_JSON_URL(version), 'json');
			const latest = this._getLatestVersion(stableData.versions);
			if (!latest) {
				this.logger?.log('No valid stable versions found.', 'warn');
				return;
			}

			const { version: latestVersion, hash: latestHash } = latest;
			const latestLink = latestHash
				? `https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@${latestHash}/release/diaphantium.user.js`
				: CONFIG.GITHUB_SCRIPT_URL(version);

			if (compareVersions(latestVersion, version) === 1) {
				this._promptUpdate(latestVersion, latestLink);
			}
		} catch (error) {
			const isDevVersion = /[-+]/.test(version);
			if (!isDevVersion) {
				this.logger?.log(`Failed to fetch stable versions.\n${error}`, 'error');
			}
		}
	}

	_getLatestVersion(versions) {
		if (!Array.isArray(versions) || versions.length === 0) return null;
		return versions.reduce((latest, current) =>
			compareVersions(current.version, latest.version) > 0 ? current : latest
		);
	}

	async _promptUpdate(newVersion, downloadUrl) {
		const skipped = await Bridge.getValue('skippedVersion', '');
		if (skipped === newVersion) return;

		const result = await Nuntaria.fire({
			type: 'info',
			title: `${CONFIG.SCRIPT_NAME}: new version available!`,
			text: `Do you want to update to version ${newVersion}?`,
			theme: 'dark',
			position: 'top-right',
			timer: CONFIG.UPDATE_MODAL_TIMER,
			timerPause: true,
			buttons: [
				{ label: 'Close', value: 'close', variant: 'cancel' },
				{ label: 'Skip', value: 'skip', variant: 'warning' },
				{ label: 'Update', value: 'update', variant: 'primary' },
			],
		});

		if (result === 'update') {
			Bridge.openTab(downloadUrl);
		} else if (result === 'skip') {
			Bridge.setValue('skippedVersion', newVersion);
		}
	}
}
