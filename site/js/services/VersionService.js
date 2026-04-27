import { fetchStableBuilds, getLatestBuild } from '../api/builds.js';
import { GITHUB_RELEASE_URL } from '../config.js';

function buildDownloadUrl(hash) {
	return hash
		? `https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@${hash}/release/diaphantium.user.js`
		: GITHUB_RELEASE_URL;
}

export class VersionService {
	async getLatestStableUrl() {
		const fallback = `${GITHUB_RELEASE_URL}?t=${Date.now()}`;
		try {
			const versions = await fetchStableBuilds();
			return buildDownloadUrl(getLatestBuild(versions).hash);
		} catch {
			return fallback;
		}
	}

	generateDevUrl() {
		return `${GITHUB_RELEASE_URL}?t=${Date.now()}`;
	}

	async updateHeroBadge() {
		const el = document.querySelector('.hero-version');
		if (!el) return;
		try {
			const versions = await fetchStableBuilds();
			el.textContent = getLatestBuild(versions).version;
		} catch {
			el.textContent = '-';
		}
	}

	async setupDownloadButtons() {
		const buttons = document.querySelectorAll('[data-download]');
		if (!buttons.length) return;
		const url = await this.getLatestStableUrl();
		buttons.forEach(btn => { btn.href = url; });
	}

	setupDevButton() {
		const btn = document.querySelector('[data-dev-download]');
		if (!btn) return;
		btn.removeAttribute('href');
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			window.open(this.generateDevUrl(), '_blank');
		});
	}
}
