// ==UserScript==

// @name			Diaphantium
// @version			4.0.0
// @description		The tool created to make your life easier
// @author			OrakomoRi

// @match			https://*.tankionline.com/*

// @icon			https://i.imgur.com/QhCfrV5.png

// @require			https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js

// @updateURL		https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/Diaphantium.user.js
// @downloadURL		https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/Diaphantium.user.js

// @connect			raw.githubusercontent.com
// @connect			cdn.jsdelivr.net

// @run-at			document-start
// @grant			GM_xmlhttpRequest
// @grant			unsafeWindow

// ==/UserScript==

// Adding personal defender code on the page

GM_xmlhttpRequest({
	method: 'GET',
	url: 'https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.min.js',
	nocache: true,
	onload: value => {
		eval(value.responseText);
	}
});

// Including external library to use custom modal
GM_xmlhttpRequest({
	method: 'GET',
	url: 'https://cdn.jsdelivr.net/npm/sweetalert2@11',
	nocache: true,
	onload: value => {
		eval(value.responseText);
	}
});

// Other stuff

(function() {
	/**
	 * Configs
	 * 
	 * @param {Boolean} updateCheck - Checks for userscript updates.
	 * 
	 * @param {Array} customModal - Enable custom modal.
	 * Uses SweetAlert2 library (https://cdn.jsdelivr.net/npm/sweetalert2@11) for the modal.
	 * @param {Boolean} customModal.enable - When set to false, the default modal will be used.
	 * @param {*} customModal.timer - Can be set (number | false): used to set the time
	 * the custom modal should wait for response untill it closes.
	 * 
	 * @param {Boolean} hasIgnoredUpdate - Used for the updater.
	*/
	
	const updateCheck = true;

	const customModal = {
		enable: true,
		timer: 5000,
	};

	let hasIgnoredUpdate = false;


	// ======== CODE ========
	
	if (updateCheck) checkForUpdate();

	function checkForUpdate(){

		if (!(window.location.href.includes('tankionline.com'))){
			return;
		}

		if (hasIgnoredUpdate){
			return;
		}

		GM_xmlhttpRequest({
			method: 'GET',
			url: 'https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js',
			nocache: true,
			onload: value => {
				const data = value.responseText;

				GM_xmlhttpRequest({
					method: 'GET',
					url: 'https://cdn.jsdelivr.net/gh/OrakomoRi/CompareVersions@main/JS/compareversions.min.js',
					nocache: true,
					onload: compare => {
						const script = document.createElement('script');
						script.innerHTML = compare.responseText;
						document.head.appendChild(script);
						
						// Extract version from the script on GitHub
						const match = data.match(/@version\s+([\w.-]+)/);
						if (!match) {
							console.log("Unable to extract version from the GitHub script.", "e");
							return;
						}

						const githubVersion = match[1];
						const currentVersion = GM_info.script.version;

						const compareResult = compareVersions(githubVersion, currentVersion);

						if (compareResult !== 1) {
							console.log(`========\nDiaphantium\nYou have the latest version of the script.`);
							console.log(`Github version : local version === ${githubVersion} : ${currentVersion}\n========`);
							return;
						}

						console.log(`========\nDiaphantium\nA new version is available. Please update your script.`);
						console.log(`Github version : local version === ${githubVersion} : ${currentVersion}\n========`);

						if(customModal.enable) {
							// if a version is skipped, don't show the update message again until the next version
							if (localStorage.getItem('Diaphantium.skipVersion') === githubVersion) {
								return;
							}

							const style = document.createElement('style');
							style.textContent = '.swal2-container { z-index: 2400; }';
							document.head.appendChild(style);

							Swal.fire({
								position: 'top-end',
								backdrop: false,
								title: 'Diaphantium: New version is available.',
								text: 'Do you want to update?',
								showCancelButton: true,
								showDenyButton: true,
								confirmButtonText: 'Update',
								denyButtonText:'Skip',
								cancelButtonText: 'Close',
								timer: customModal.timer ?? 5000,
								timerProgressBar: true,
								didOpen: (modal) => {
									modal.onmouseenter = Swal.stopTimer;
									modal.onmouseleave = Swal.resumeTimer;
								}
							}).then((result) => {
								if (result.isConfirmed) {
									window.location.replace('https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js');
								} else if(result.isDenied) {
									localStorage.setItem('Diaphantium.skipVersion', githubVersion);
								}
							});
						} else {
							var result = window.confirm('Diaphantium: A new version is available. Please update your script.');

							if (result) {
								window.location.replace('https://raw.githubusercontent.com/OrakomoRi/Diaphantium/main/release/diaphantium.user.js');
							}
						}
					}
				});
			}
		});
		
		hasIgnoredUpdate = true;
	}
})();