import { BUILDS_API_URL } from '../config.js';

let _cache = null;

export async function fetchStableBuilds() {
	if (_cache) return _cache;

	const response = await fetch(`${BUILDS_API_URL}/stable.json?t=${Date.now()}`);
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

	const data = await response.json();
	if (!data?.versions?.length) throw new Error('No stable versions found');

	_cache = data.versions;
	return _cache;
}

export function getLatestBuild(versions) {
	return versions[versions.length - 1];
}
