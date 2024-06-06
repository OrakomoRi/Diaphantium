// ==UserScript==

// @name			Diaphantium
// @version			4.0.1
// @description		The tool created to make your life easier
// @author			OrakomoRi

// @match			https://*.tankionline.com/*

// @icon			https://i.imgur.com/QhCfrV5.png

// @require			https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js

// @updateURL		https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js
// @downloadURL		https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js

// @connect			raw.githubusercontent.com
// @connect			cdn.jsdelivr.net

// @run-at			document-start
// @grant			GM_xmlhttpRequest
// @grant			unsafeWindow
// @grant			GM_getValue
// @grant			GM_setValue
// @grant			GM_openInTab

// @require			https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.min.js

// @require			https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require			https://cdn.jsdelivr.net/gh/OrakomoRi/CompareVersions@main/JS/compareversions.min.js

// ==/UserScript==

// Other stuff

(function() {
	'use strict';

	/**
	 * Configs
	 * 
	 * @param {Boolean} updateCheck - Checks for userscript updates
	 * 
	 * @param {Array} customModal - Enable custom modal
	 * Uses SweetAlert2 library (https://cdn.jsdelivr.net/npm/sweetalert2@11) for the modal
	 * @param {Boolean} customModal.enable - When set to false, the default modal will be used
	 * @param {*} customModal.timer - Can be set (number | false): used to set the time
	 * the custom modal should wait for response untill it closes
	 * 
	 * @param {Boolean} hasIgnoredUpdate - Used for the updater
	 * 
	 * @param {String} GITHUB_SCRIPT_URL - Link to the script to update
	*/
	
	const updateCheck = true;

	const customModal = {
		enable: true,
		timer: 5000,
	};

	const GITHUB_SCRIPT_URL = GM_info.script.updateURL;


	// ======== CODE ========

	/**
	 * Function to check if the script is updated 
	*/
	function checkForUpdates() {
		GM_xmlhttpRequest({
			method: 'GET',
			url: GITHUB_SCRIPT_URL,
			onload: function(response) {
				// Script from GitHub
				const data = response.responseText;

				// Try to extract version from the script on GitHub
				const match = data.match(/@version\s+([\w.-]+)/);
				if (!match) {
					console.log(`========\n${GM_info.script.name}\nUnable to extract version from the GitHub script.\n========`);
					return;
				}

				// Version on GitHub
				const githubVersion = match[1];
				// Current version
				const currentVersion = GM_info.script.version;

				// Compare versions
				const compareResult = compareVersions(githubVersion, currentVersion);

				console.log(`========\n${GM_info.script.name}\n`);
				
				switch (compareResult) {
					case 1:
						console.log(`A new version is available. Please update your script.\n`);
						console.log(`GitHub × Your: ${githubVersion} × ${currentVersion}`);
						promptUpdate(githubVersion);
						break;
					case 0:
						console.log(`You are using the latest version.`);
						break;
					case -1:
						console.log(`You are using a version newer than the one on GitHub.`);
						break;
					case -2:
						console.log(`Error comparing versions.`);
						break;
				}

				console.log(`Your: ${currentVersion} --- GitHub: ${githubVersion}`);
				console.log(`\n========`);
			},
			onerror: function(error) {
				console.error('Failed to check for updates:', error);
			}
		});
	}

	function promptUpdate(newVersion) {
		const skippedVersion = GM_getValue('skippedVersion', '');
		if (skippedVersion === newVersion) return;

		if (customModal.enable) {
			const style = document.createElement('style');
			style.textContent = '.swal2-container { z-index: 8888; } .swal2-container h1, .swal2-container h2, .swal2-container h3, .swal2-container h4, .swal2-container span, .swal2-container p { color: #000000; } ';
			document.head.appendChild(style);

			Swal.fire({
				position: 'top-end',
				backdrop: false,
				color: "#000000",
				background: "#ffffff",
				title: `${GM_info.script.name}: new version is available!`,
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
			var result = window.confirm(`${GM_info.script.name}: A new version is available. Please update your script.`);

			if (result) {
				GM_openInTab(GITHUB_SCRIPT_URL, { active: true });
			}
		}
	}

	if (updateCheck) checkForUpdates();
})();