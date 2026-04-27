// ==UserScript==

// @name			Diaphantium
// @version			5.0.1+build.43
// @description		The tool created to make your life easier
// @author			OrakomoRi

// @icon			https://i.imgur.com/QhCfrV5.png

// @match			https://*.tankionline.com/*
// @include			https://*test*.tankionline.com/*

// @downloadURL		none
// @updateURL		none

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

// ==/UserScript==

(function () {
	'use strict';

	const LOADER_URL = 'https://diaphantium-builds.vercel.app/loader.min.js';

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

	Object.defineProperty(unsafeWindow, '__DIAPHANTIUM__', {
		value: Object.freeze({
			version: GM_info?.script?.version || null
		}),
		writable: false,
		configurable: false
	});

	GM_xmlhttpRequest({
		method: 'GET',
		url: LOADER_URL,
		nocache: true,
		onload: (response) => {
			if (response.status === 200) {
				const script = document.createElement('script');
				script.textContent = response.responseText;
				if (document.body) {
					document.body.appendChild(script);
				} else {
					document.addEventListener('DOMContentLoaded', () => {
						document.body.appendChild(script);
					});
				}
				console.log('[Diaphantium] Loader script loaded successfully!');
			} else {
				console.error('[Diaphantium] Loader script not found!');
			}
		},
		onerror: (error) => {
			console.error('[Diaphantium] Failed to load loader script!', error);
		}
	});
})();
