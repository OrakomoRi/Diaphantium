const BUILDS_API_URL = 'https://diaphantium-builds.vercel.app';
const STATICALLY_BASE = 'https://cdn.statically.io/gh/OrakomoRi/Diaphantium';

export const config = { runtime: 'edge' };

export default async function handler(req) {
	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
	};

	try {
		const res = await fetch(`${BUILDS_API_URL}/stable.json`);
		if (!res.ok) throw new Error(`stable.json fetch failed: ${res.status}`);

		const data = await res.json();
		const versions = data?.versions;
		if (!versions?.length) throw new Error('No stable versions found');

		const latest = versions[versions.length - 1];
		const { version, hash } = latest;

		if (!hash) throw new Error('No hash in latest build');

		const url = `${STATICALLY_BASE}@${hash}/release/diaphantium.user.js`;

		return new Response(JSON.stringify({ version, hash, url }), { headers });
	} catch (err) {
		return new Response(
			JSON.stringify({ error: err.message }),
			{ status: 502, headers }
		);
	}
}
