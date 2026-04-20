'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '../..');
const { version } = JSON.parse(execSync('git show :package.json', { cwd: root }).toString());

const userFile = path.join(root, 'release', 'diaphantium.user.js');

const original = fs.readFileSync(userFile, 'utf8');
const updated = original.replace(/\/\/ @version\s+\S+/, `// @version\t\t\t${version}`);

if (updated !== original) {
	fs.writeFileSync(userFile, updated, 'utf8');
	console.log(`[inject-version] Updated diaphantium.user.js -> ${version}`);
}

execSync(`git add "${userFile}"`, { stdio: 'inherit' });
