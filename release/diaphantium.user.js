// ==UserScript==

// @name			Diaphantium
// @version			5.0.0-alpha.12
// @description		The tool created to make your life easier
// @author			OrakomoRi

// @match			https://*.tankionline.com/*

// @icon			https://i.imgur.com/QhCfrV5.png

// @updateURL		https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js
// @downloadURL		https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js

// @connect			orakomori.github.io
// @connect			raw.githubusercontent.com
// @connect			cdn.jsdelivr.net

// @require			https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require			https://cdn.jsdelivr.net/gh/OrakomoRi/CompareVersions@main/JS/compareversions.min.js

// @require			https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/userscript/Logger.js

// @run-at			document-start
// @grant			GM_xmlhttpRequest
// @grant			unsafeWindow
// @grant			GM_getValue
// @grant			GM_setValue
// @grant			GM_openInTab

// ==/UserScript==

(function() {
	'use strict';

	/**
	 * Configs
	 * 
	 * @param {boolean} updateCheck - Checks for userscript updates
	 * 
	 * @param {object} customModal - Enable custom modal
	 * Uses SweetAlert2 library (https://cdn.jsdelivr.net/npm/sweetalert2@11) for the modal
	 * @param {boolean} customModal.enable - When set to false, the default modal will be used
	 * @param {number|false} customModal.timer - Can be set (number | false): used to set the time
	 * the custom modal should wait for response untill it closes
	 * 
	 * @param {object} script - Script metadata
	 * @param {string} script.version - Version of the main userscript
	 * @param {string} script.name - Name of the main userscript
	 * @param {string} script.mainJS - Main JS content loaded from builds
	 * 
	 * @param {string} GITHUB_SCRIPT_URL - Link to the script to update
	 * @param {string} STABLE_JSON_URL - Link to the JSON with stable versions and their links
	 * 
	 * @type {Logger} - Instance of the Logger class used for structured logging
	*/
	
	const updateCheck = true;

	const customModal = {
		enable: true,
		timer: 5000,
	};

	const script = {
		version: GM_info.script.version,
		name: GM_info.script.name,
		mainJS: null,
	};

	const GITHUB_SCRIPT_URL = GM_info.script.updateURL;
	const STABLE_JSON_URL = `https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@builds/stable.json?v=${script.version}`;
	
	const logger = new Logger(script.name);
	// logger.enableLogging();


	// ======== CODE ========

	/**
	 * Fetches a resource from a given URL
	 *
	 * @param {string} url - The URL of the resource to fetch
	 * @param {'text'|'json'} [format='text'] - The format to return the resource in
	 * @returns {Promise<string|Object>} - Resolves with the resource content in the specified format
	 */
	async function fetchResource(url, format = 'text') {
		return new Promise((resolve, reject) => {
			GM_xmlhttpRequest({
				method: 'GET', 
				url,
				onload: (response) => {
					if (response.status === 200) {
						if (format === 'json') {
							try {
								const jsonData = JSON.parse(response.responseText);
								if (typeof jsonData !== 'object' || jsonData === null) {
									throw new Error('Parsed JSON is not an object');
								}
								resolve(jsonData);
							} catch (error) {
								if (logger) {
									logger.log(`Failed to parse JSON from ${url}: ${error.message}`, 'error');
								}
								reject(new Error(`Failed to parse JSON from ${url}: ${error.message}`));
							}
						} else {
							resolve(response.responseText);
						}
					} else {
						// Don't log 404 for stable.json - it's expected for dev versions
						const isStableJson = url.includes('stable.json');
						if (logger && !(isStableJson && response.status === 404)) {
							logger.log(`Failed to fetch resource from ${url} (${response.status})`, 'error');
						}
						reject(new Error(`Failed to fetch resource from ${url} (${response.status})`));
					}
				},
				onerror: (error) => reject(error),
			});
		});
	}

	/**
	 * Function to check if the script is updated 
	 */
	function checkForUpdates() {
		GM_xmlhttpRequest({
			method: 'GET',
			url: GITHUB_SCRIPT_URL,
			onload: function(response) {
				if (response.status !== 200) {
					if (logger) {
						logger.log(`Failed to fetch GitHub script: ${response.status}`, 'error');
					}
					return;
				}

				// Script from GitHub
				const data = response.responseText;
				// Try to extract version from the script on GitHub
				const match = data.match(/@version\s+([\w.+-]+)/);
				if (!match) {
					if (logger) {
						logger.log(`Unable to extract version from the GitHub script.`, 'error');
					}
					return;
				}

				// Version on GitHub
				const githubVersion = match[1];
				// Compare versions
				const compareResult = compareVersions(githubVersion, script.version);

				if (logger) {
					logger.logVersionComparison(compareResult, script.version, githubVersion);
				}

				if (compareResult === 1) {
					findLatestStableVersion();
				}
			},
			onerror: function(error) {
				if (logger) {
					logger.log(`Failed to check for updates: ${error}`, 'error');
				}
			}
		});
	}

	/**
	 * Find the latest version
	 * 
	 * @param {array} versions - Array of stable versions
	 * @returns {Object|null} - The object representing the latest version, or `null` if the array is empty or invalid
	 */
	function getLatestVersion(versions) {
		if (!Array.isArray(versions) || versions.length === 0) return null;

		return versions.reduce((latest, current) =>
			compareVersions(current.version, latest.version) > 0 ? current : latest
		);
	}

	/**
	 * Check for updates by parsing stable.json with multiple versions
	 */
	async function findLatestStableVersion() {
		try {
			const stableData = await fetchResource(STABLE_JSON_URL, 'json');
			const latestVersionData = getLatestVersion(stableData.versions);
			const { version: latestVersion, link: latestLink } = latestVersionData || {};

			if (latestVersionData && compareVersions(latestVersion, script.version) === 1) {
				promptUpdate(latestVersion, latestLink);
			} else {
				if (logger) {
					logger.log(`${script.name.toUpperCase()}: No valid stable versions found.`, 'warn');
				}
			}
		} catch (error) {
			// Don't log error for dev versions - stable.json might not exist yet
			const isDevVersion = /[-+]/.test(script.version);
			if (logger && !isDevVersion) {
				logger.log(`${script.name.toUpperCase()}: Failed to fetch stable versions.\n${error}`, 'error');
			}
		}
	}

	/**
	 * Prompts the user to update to a new version using a modal or confirm dialog
	 *
	 * @param {string} newVersion - The new version available for update
	 * @param {string} downloadUrl - The URL to download the new version (userscript URL)
	 */
	function promptUpdate(newVersion, downloadUrl) {
		const skippedVersion = GM_getValue('skippedVersion', '');
		if (skippedVersion === newVersion) return;

		if (customModal.enable) {
			const style = document.createElement('style');
			style.textContent = '.swal2-container { z-index: 8888; }';
			document.head.appendChild(style);

			Swal.fire({
				position: 'top-end',
				backdrop: false,
				theme: 'dark',
				title: `${script.name}: new version is available!`,
				text: `Do you want to update to version ${newVersion}?`,
				icon: 'info',
				showCancelButton: true,
				showDenyButton: true,
				confirmButtonText: 'Update',
				denyButtonText: 'Skip',
				cancelButtonText: 'Close',
				timer: customModal.timer ?? 5000,
				timerProgressBar: true,
				didOpen: (modal) => {
					modal.onmouseenter = Swal.stopTimer;
					modal.onmouseleave = Swal.resumeTimer;
				}
			}).then((result) => {
				if (result.isConfirmed) {
					GM_openInTab(GITHUB_SCRIPT_URL, { active: true });
				} else if (result.isDenied) {
					GM_setValue('skippedVersion', newVersion);
				}
			});
		} else {
			if (confirm(`${script.name}: A new stable version is available. Update now?`)) {
				GM_openInTab(GITHUB_SCRIPT_URL, { active: true });
			}
		}
	}

	/**
	 * Load main script resources from builds
	 */
	async function loadResources() {
		try {
			const cachedVersion = GM_getValue('DiaphantiumVersion', '');
			const isSameVersion = cachedVersion === script.version;

			if (isSameVersion) {
				// Load from cache
				if (logger) logger.log(`Loading resources from cache.`, 'info');
				script.mainJS = GM_getValue('DiaphantiumMainJS', null);
			} else {
				// Fetch from CDN
				if (logger) logger.log(`Fetching resources from CDN.`, 'info');
				
				const MAIN_JS_URL = `https://cdn.jsdelivr.net/gh/OrakomoRi/Diaphantium@builds/versions/${script.version}/diaphantium.min.js`;

				script.mainJS = await fetchResource(MAIN_JS_URL);

				// Cache the resources
				GM_setValue('DiaphantiumMainJS', script.mainJS);
				GM_setValue('DiaphantiumVersion', script.version);

				if (logger) logger.log(`Resources cached.`, 'success');
			}

			// Inject main script
			if (script.mainJS) {
				const mainScript = document.createElement('script');
				mainScript.setAttribute('data-resource', 'DiaphantiumJS');
				mainScript.textContent = script.mainJS;
				(document.body || document.documentElement).appendChild(mainScript);
				
				if (logger) logger.log(`Main script injected successfully.`, 'success');
			}

		} catch (error) {
			console.error(`${script.name}: Error loading resources:`, error);
		}
	}

	// Main execution
	(async () => {
		await loadResources();
		
		if (updateCheck) {
			checkForUpdates();
		}
	})();
})();