import { fetchStableBuilds, getLatestBuild } from '../api/builds.js';
import { CDN_BASE, LOCAL_SCRIPT_PATH } from '../config.js';

export class ScriptLoader {
	async load() {
		try {
			const versions = await fetchStableBuilds();
			const latest = getLatestBuild(versions);
			const script = document.createElement('script');
			script.src = `${CDN_BASE}/versions/${latest.version}/diaphantium.min.js`;
			script.onerror = () => this._loadFallback();
			document.head.appendChild(script);
		} catch {
			this._loadFallback();
		}
	}

	_loadFallback() {
		const script = document.createElement('script');
		script.src = LOCAL_SCRIPT_PATH;
		document.head.appendChild(script);
	}
}
