import { fetchStableBuilds, getLatestBuild } from '../api/builds.js';
import { CDN_BASE, LOCAL_SCRIPT_PATH, IS_LOCAL } from '../config.js';

export class ScriptLoader {
	async load() {
		if (IS_LOCAL) {
			this._loadFallback();
			return;
		}

		try {
			const versions = await fetchStableBuilds();
			const latest = getLatestBuild(versions);
			const script = document.createElement('script');
			const base = latest.version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/)?.[0] ?? latest.version;
			script.src = `${CDN_BASE}/versions/${base}/${latest.version}/diaphantium.min.js`;
			script.onerror = () => this._loadFallback();
			document.head.appendChild(script);
		} catch {
			this._loadFallback();
		}
	}

	_loadFallback() {
		const script = document.createElement('script');
		script.src = `${LOCAL_SCRIPT_PATH}?t=${Date.now()}`;
		document.head.appendChild(script);
	}
}
