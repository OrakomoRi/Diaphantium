// ==UserScript==

// @name			Diaphantium (development)
// @version			0.0.0-development
// @description		Loads Diaphantium from a local build or from a branch channel
// @author			OrakomoRi

// @icon			https://i.imgur.com/QhCfrV5.png

// @match			https://*.tankionline.com/*
// @include			https://*test*.tankionline.com/*

// @downloadURL		none
// @updateURL		none

// @connect			localhost
// @connect			127.0.0.1
// @connect			orakomori.github.io
// @connect			raw.githubusercontent.com
// @connect			diaphantium-builds.vercel.app
// @connect			cdn.statically.io

// @run-at			document-start
// @grant			GM_xmlhttpRequest
// @grant			unsafeWindow
// @grant			GM_getValue
// @grant			GM_setValue
// @grant			GM_openInTab
// @grant			GM_registerMenuCommand

// ==/UserScript==

(function () {
	'use strict';

	const LOCAL_SOURCE = 'http://localhost:4173/';
	const CHANNELS = 'https://diaphantium-builds.vercel.app/channels/';

	window.addEventListener('diaphantium:fetch', (event) => {
		const { id, url, format } = event.detail;

		GM_xmlhttpRequest({
			method: 'GET',
			url: url,
			responseType: format === 'base64' ? 'blob' : 'text',
			onload: (response) => {
				let data;

				try {
					if (format === 'json') {
						data = JSON.parse(response.responseText);
					} else if (format === 'base64') {
						const reader = new FileReader();
						reader.onloadend = () => {
							data = reader.result.split(',')[1];
							window.dispatchEvent(new CustomEvent('diaphantium:fetch:response', {
								detail: { id, data }
							}));
						};
						reader.readAsDataURL(response.response);
						return;
					} else {
						data = response.responseText;
					}

					window.dispatchEvent(new CustomEvent('diaphantium:fetch:response', {
						detail: { id, data }
					}));
				} catch (error) {
					window.dispatchEvent(new CustomEvent('diaphantium:fetch:response', {
						detail: { id, error: error.message }
					}));
				}
			},
			onerror: (error) => {
				window.dispatchEvent(new CustomEvent('diaphantium:fetch:response', {
					detail: { id, error: error.message || 'Network error' }
				}));
			}
		});
	});

	window.addEventListener('diaphantium:store:get', (event) => {
		const { id, key, default: defaultValue } = event.detail;
		const value = GM_getValue(key, defaultValue);

		window.dispatchEvent(new CustomEvent('diaphantium:store:response', {
			detail: { id, value }
		}));
	});

	window.addEventListener('diaphantium:store:set', (event) => {
		const { key, value } = event.detail;
		GM_setValue(key, value);
	});

	window.addEventListener('diaphantium:open-tab', (event) => {
		const { url } = event.detail;
		GM_openInTab(url, { active: true });
	});

	window.addEventListener('diaphantium:update', (event) => {
		const { hash } = event.detail;
		const updateUrl = `https://cdn.statically.io/gh/OrakomoRi/Diaphantium@${hash}/release/diaphantium.user.js`;
		GM_openInTab(updateUrl, { active: true });
	});

	const source = GM_getValue('source', LOCAL_SOURCE);

	GM_registerMenuCommand(`Source: ${source}`, () => {});

	GM_registerMenuCommand('Use local build', () => {
		GM_setValue('source', LOCAL_SOURCE);
		location.reload();
	});

	GM_registerMenuCommand('Use branch channel…', () => {
		const branch = prompt('Branch name', 'dev');
		if (!branch) return;
		GM_setValue('source', `${CHANNELS}${branch.replace(/[^A-Za-z0-9._-]/g, '-')}/`);
		location.reload();
	});

	const LOADER_URL = `${source}loader.min.js?t=${Date.now()}`;

	const pluginsReadyQueue = [];

	Object.defineProperty(unsafeWindow, '__DIAPHANTIUM__', {
		value: Object.freeze({
			version: GM_info?.script?.version || null,
			source,
			plugins: {
				register: () => null,
				onReady: (callback) => pluginsReadyQueue.push(callback),
				__readyQueue: pluginsReadyQueue
			}
		}),
		writable: false,
		configurable: false
	});

	GM_xmlhttpRequest({
		method: 'GET',
		url: LOADER_URL,
		nocache: true,
		onload: (response) => {
			if (response.status === 200 || response.status === 304) {
				const script = document.createElement('script');
				script.textContent = response.responseText;
				if (document.body) {
					document.body.appendChild(script);
				} else {
					document.addEventListener('DOMContentLoaded', () => {
						document.body.appendChild(script);
					});
				}
				console.log(`[Diaphantium] Development loader loaded from ${source}`);
			} else {
				console.error(`[Diaphantium] Failed to load the development loader! Status: ${response.status}\nLoader URL: ${LOADER_URL}`);
			}
		},
		onerror: (error) => {
			console.error('[Diaphantium] Failed to load the development loader!', error);
		}
	});
})();
