const fs = require('fs');
const path = require('path');
const https = require('https');

function checkUrl(url) {
	return new Promise((resolve) => {
		const req = https.request(url, { method: 'HEAD' }, (res) => {
			resolve(res.statusCode >= 200 && res.statusCode < 400);
		});
		req.on('error', () => resolve(false));
		req.end();
	});
}

module.exports = async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');

	let stable;
	try {
		const filePath = path.join(process.cwd(), 'stable.json');
		stable = JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch {
		return res.status(500).json({ error: 'Failed to read stable.json' });
	}

	const versions = stable?.versions;
	if (!Array.isArray(versions) || versions.length === 0) {
		return res.status(500).json({ error: 'No versions found in stable.json' });
	}

	const latest = versions[versions.length - 1];
	if (!latest?.hash) {
		return res.status(500).json({ error: 'Latest version has no hash' });
	}

	const url = `https://cdn.statically.io/gh/OrakomoRi/Diaphantium@${latest.hash}/release/diaphantium.user.js`;

	const exists = await checkUrl(url);
	if (!exists) {
		return res.status(404).json({ error: 'Resource not found', url });
	}

	res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
	return res.redirect(302, url);
};
