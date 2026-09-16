import { compareVersions } from '@utensilia/compare-versions';
import type { Logger } from '@utensilia/logger';
import { CONFIG } from '../config/config';
import { Bridge } from './Bridge';
import { loadUpdateToast } from './UpdateToast';

export interface StableVersion {
	version: string;
	hash: string;
	date?: string;
}

interface StableData {
	versions?: StableVersion[];
}

export class UpdateChecker {
	private readonly version: string | null;
	private readonly logger: Logger | undefined;

	constructor(logger?: Logger) {
		this.version = CONFIG.SCRIPT_VERSION;
		this.logger = logger;
	}

	async check(): Promise<void> {
		if (!this.version) return;

		try {
			const stableData = await Bridge.fetch<StableData | null>(CONFIG.STABLE_JSON_URL(this.version), 'json');

			if (!stableData?.versions?.length) {
				this.logger?.log('No stable versions found', 'warn');
				return;
			}

			const latest = this.getLatestVersion(stableData.versions);
			if (!latest) {
				this.logger?.log('Failed to determine latest version', 'warn');
				return;
			}

			const comparison = compareVersions(latest.version, this.version);

			switch (comparison) {
				case 1:
					this.logger?.log(`A new version is available: ${latest.version}.`, 'info');
					break;
				case 0:
					this.logger?.log(/[-+]/.test(this.version)
						? 'You are using some version that is based on the latest stable.'
						: 'You are using the latest stable version.', 'info');
					break;
				case -1:
					this.logger?.log('You are using a version newer than the latest stable.', 'warn');
					break;
			}

			this.logger?.log(`Your × Stable:\n${this.version} × ${latest.version}`, 'info');

			if (comparison === 1) {
				await this.showUpdateToast(latest);
			}
		} catch (error) {
			const isDevVersion = /[-+]/.test(this.version);
			if (!isDevVersion) {
				this.logger?.log(`Update check failed: ${error}`, 'error');
			}
		}
	}

	private getLatestVersion(versions: StableVersion[]): StableVersion | null {
		if (!Array.isArray(versions) || versions.length === 0) return null;
		return versions.reduce((latest, current) =>
			compareVersions(current.version, latest.version) > 0 ? current : latest,
		);
	}

	private async showUpdateToast({ version, hash, date }: StableVersion): Promise<void> {
		const skipped = await Bridge.getValue('skippedVersion', '');
		if (skipped === version) return;

		try {
			const url = CONFIG.UPDATE_TOAST_URL;
			this.logger?.log(`Fetching update toast: ${url}`, 'info');
			const show = await loadUpdateToast(url);

			const result = await show({
				name: CONFIG.SCRIPT_NAME,
				version,
				date,
				duration: CONFIG.UPDATE_TOAST_TIMER,
			});

			if (result === true) {
				Bridge.updateScript(hash);
			} else if (result === 'skip') {
				Bridge.setValue('skippedVersion', version);
			}
		} catch (error) {
			this.logger?.log(`Failed to show update toast: ${error}`, 'error');
		}
	}
}
