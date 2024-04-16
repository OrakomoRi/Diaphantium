/**
 * CLICKER
 * This function simulates a clicker by
 * triggering a keypress event on the page.
 * Note that it won't input any characters
 * into the chat, so there's no need to worry.
 *
 * @param {string} popupSelector - CSS selector of the popup.
*/

function clicker(popupSelector) {
	'use strict';

	// Keys to click
	let keys = [];

	// Update keys to click
	function getKeys() {
		keys = [];

		// jQuery element of each supply button that have state "on"
		// const elements = $(`${popupSelector} .content[data-tab="clicker"] .supplies .supply[data-state="on"]`);
		const elements = JSON.parse(localStorage.getItem('Diaphantium.clickValues'));

		// Filling the array
		for (let i = 0; i < elements.length; i++) {
			if (elements[i].value === 'on') {
				const key = elements[i].key;
				keys.push(key);
			}
		}		
	}

	// Clickers' states
	var suppliesClickerEnabled = false;
	var minesClickerEnabled = false;

	// Function to simulate keypress
	function simulateKey(key) {
		const eventDown = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: key,
			code: 'Digit' + key,
			charCode: key.charCodeAt(0),
			keyCode: key.charCodeAt(0),
			which: key.charCodeAt(0)
		});

		const eventUp = new KeyboardEvent('keyup', {
			bubbles: true,
			cancelable: true,
			key: key,
			code: 'Digit' + key,
			charCode: key.charCodeAt(0),
			keyCode: key.charCodeAt(0),
			which: key.charCodeAt(0)
		});

		document.dispatchEvent(eventDown);
		document.dispatchEvent(eventUp);
	}

	// Cyclic function for supplies
	function clickSupplies() {
		// If the supply clicker is not enabled
		if (!suppliesClickerEnabled) {
			return;
		}

		// Checks if the keys was updated
		getKeys();

		// Simulate keypress for each enabled supply
		keys.forEach((key, index) => {
			simulateKey(key);
		});

		requestAnimationFrame(() => clickSupplies());
	}

	// The same cyclic function, but for mines
	function clickMines() {
		// If the mine clicker is not enabled
		if (!minesClickerEnabled) {
			return;
		}

		// Simulate keypress for mines
		simulateKey('5');

		// Check the delay
		var mine_delay = JSON.parse(localStorage.getItem('Diaphantium.mine_delay'));

		let delay = mine_delay[0];

		setTimeout(function () {
			clickMines();
		}, delay);
	}

	// Toggle the state of the supply clicker
	function toggleSuppliesClicker(popupSelector) {
		suppliesClickerEnabled = !suppliesClickerEnabled;

		// If checkbox exists
		var $checkbox = $(`${popupSelector} .click_enable .checkbox.supplies`);
		if ($checkbox.length > 0) {
			// Also, change the state of checkbox for supply clicker state
			$checkbox.prop('checked', suppliesClickerEnabled);
		}

		// If icon exists
		var $icon = $('.diaphantium_mobile.icon[author="OrakomoRi"].supplies');
		if ($icon.length > 0) {
			$icon.toggleClass('active');
		}

		// Updates stored value
		localStorage.setItem('Diaphantium.clickSuppliesState', suppliesClickerEnabled);

		if (suppliesClickerEnabled) {
			clickSupplies();
		}
	}

	// Toggle the state of the mine clicker
	function toggleMinesClicker() {
		minesClickerEnabled = !minesClickerEnabled;

		// If icon exists
		var $icon = $('.diaphantium_mobile.icon[author="OrakomoRi"].mines');
		if ($icon.length > 0) {
			$icon.toggleClass('active');
		}

		if (minesClickerEnabled) {
			clickMines();
		}
	}

	// Catch all keydowns in the window
	$(document).keydown(function (event) {
		var hotkeys = JSON.parse(localStorage.getItem('Diaphantium.hotkeys'));
		let toggleKeySupplies;
		let toggleKeyMines;

		if (hotkeys && Array.isArray(hotkeys)) {
			// Search for hotkey to switch the supply clicker
			var hotkeySupplies = hotkeys.find(function (item) {
				return item.action === 'Click supplies';
			});

			// Value
			toggleKeySupplies = hotkeySupplies ? hotkeySupplies.value : null;

			// Search for hotkey to switch the mine clicker
			var hotkeyMines = hotkeys.find(function (item) {
				return item.action === 'Click mines';
			});

			// Value
			toggleKeyMines = hotkeyMines ? hotkeyMines.value : null;
		} else { // If hotkeys don't exist
			toggleKeySupplies = null;
			toggleKeyMines = null;
		}

		// "Supply clicker" hotkey pressed
		if (toggleKeySupplies &&
			event.code === toggleKeySupplies &&
			!$(event.target).is(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`)) {
			
			if (event.target.tagName === 'INPUT') {
				// Do nothing if keypress is inside input element
				return;
			}

			// Do not perform default actions with that hotkey
			event.stopPropagation();
			event.preventDefault();
			// event.stopImmediatePropagation();

			// Toggle state of supplies clicker
			toggleSuppliesClicker(popupSelector);
		}

		// "Mine clicker" hotkey pressed
		if (toggleKeyMines &&
			event.code === toggleKeyMines &&
			!$(event.target).is(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`)) {
			
			if (event.target.tagName === 'INPUT') {
				// Do nothing if keypress is inside input element
				return;
			}
				
			// Do not perform default actions with that hotkey
			event.stopPropagation();
			event.preventDefault();
			// event.stopImmediatePropagation();

			// Toggle state of mines clicker
			toggleMinesClicker();
		}

		// Force F5 of the game when user uses browser
		if (event.code === 'F5') {
			location.reload();
		}
	});

	// Check the initial state of the supplies clicker
	var storedState = localStorage.getItem('Diaphantium.clickSuppliesState');

	// If there is a stored state, set the checkbox accordingly
	if (storedState) {
		if (storedState === 'true') {
			toggleSuppliesClicker(popupSelector);
		}
	}

	// Checkbox pressed ("Clicker" page of the popup)
	$(document).on('change', `${popupSelector} .click_enable .checkbox.supplies`, function () {
		toggleSuppliesClicker(popupSelector);
	});

	// Pressed mobile icon
	$(document).on('click', '.diaphantium_mobile.icon[author="OrakomoRi"]', function() {
		// Check if the element has the class 'supplies'
		if ($(this).hasClass('supplies')) {
			// If the class 'supplies' is present, toggle the 'active' class for the element
			$(this).toggleClass('active');
			// Call the toggleSuppliesClicker function and pass the popup selector to it
			toggleSuppliesClicker(popupSelector);
		}
		// Check if the element has the class 'mines'
		else if ($(this).hasClass('mines')) {
			// If the class 'mines' is present, toggle the 'active' class for the element
			$(this).toggleClass('active');
			// Call the toggleMinesClicker function and pass the popup selector to it
			toggleMinesClicker(popupSelector);
		}
	});
}