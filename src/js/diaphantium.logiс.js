/**
 * Function that toggles the state of the popup (open/close).
 * 
 * It supports the lockedElement feature. If the user focused
 * on the game (mouse control), it will return the mouse
 * control after closing the popup window.
 * 
 * @param {string} popupSelector - CSS selector of the popup
*/

function popupToggle(popupSelector) {
	var isOpen = false; // Popup state
	let lockedElement; // The element that was in focus before the popup window was opened

	// The selector of hotkey inputs inside settings page
	const hotkeyInput = `${popupSelector} .content[data-tab="settings"] input.hotkey`;

	// If the target where was pressed the key is hotkey input, stop propagation of event
	$(hotkeyInput).on('keydown', function(event) {
		event.stopPropagation();
	});

	// Function that occures when the popup should be closed
	function popupClose(popupSelector) {
		mobileIcon();

		// Current coordinates should be saved before the popup is closed
		var currentCoordinates = {
			top: parseFloat($(popupSelector).css('top')),
			left: parseFloat($(popupSelector).css('left'))
		};
		// Save coordinates to local storage
		localStorage.setItem('Diaphantium.coordinates', JSON.stringify(currentCoordinates));

		// Save mine delay when the window is closed, but input is not applied
		var $mine_delay = $(`${popupSelector} .content[data-tab="clicker"] .text_input.delay`);
		var previousValue = JSON.parse(localStorage.getItem('Diaphantium.mine_delay'))[0] || '100';
		// Validate and save new value on change (takes only numbers)
		var newValue = $mine_delay.val();
		if (!/^\d+$/.test(newValue)) { // If incorrect input value
			$mine_delay.val(previousValue);
		} else { // Else if everything OK
			var mineDelayValues = $mine_delay.map(function () {
				return $(this).val();
			}).get();
			localStorage.setItem('Diaphantium.mine_delay', JSON.stringify(mineDelayValues));
		}

		$(popupSelector.slice(0, popupSelector.lastIndexOf(' '))).remove();
		isOpen = false;
		if (lockedElement) {
			// lockedElement supports the pointer lock request API
			lockedElement.requestPointerLock = lockedElement.requestPointerLock ||
				lockedElement.mozRequestPointerLock ||
				lockedElement.webkitRequestPointerLock;

			// The requestPointerLock method exists
			if (lockedElement.requestPointerLock) {
				lockedElement.requestPointerLock();
			} else {
				// The browser does not support the pointer locking API
			}
		} else {
			// lockedElement is not defined or does not exist
		}
	}

	// Function called when the close button is clicked
	$(document).on('click', `${popupSelector} .close`, function() {
		popupClose(popupSelector);
	});

	// Arrow key function within a page to catch hotkey press
	$(document).keydown((event) => {
		// Tries to get the hotkey value in localStorage
		var hotkeys = JSON.parse(localStorage.getItem('Diaphantium.hotkeys'));

		// Searches for 'open menu' hotkey
		var hotkeys = hotkeys && hotkeys.find(function(item) {
			return item.action === 'Open menu';
		});

		// Sets the hotkey value.
		// If the item in localStorage is not found the hotkey is default (Slash)
		var openHotkey = hotkeys ? hotkeys.value : 'Slash';

		// If the pressed key is the hotkey to open popup and the target is not input of the hotkey in settings page
		if (event.code === openHotkey && !$(event.target).is(hotkeyInput)) {
			if (event.target.tagName === 'INPUT') {
				// Do nothing if keypress is inside input element
				return;
			}

			// Do not perform hotkey-related actions in the browser or on the website
			event.preventDefault();

			if (isOpen) { // If the popup is open now
				popupClose(popupSelector);
			} else { // If it is not
				// Adds popup element on the page with all the styles
				createPopup(popupSelector);
				// Initializes clicker page
				initializeTab(popupSelector, 'clicker');
				isOpen = true;
				// Gets the locked element from the page
				lockedElement = document.pointerLockElement ||
					document.mozPointerLockElement ||
					document.webkitPointerLockElement;
				// Exit mouse pointer capture mode
				document.exitPointerLock();
			}
		}
	});

	$(document).on('click', function(event) {
		const mainIconSelector = '.diaphantium_mobile.icon.main[author="OrakomoRi"]';
		const iconElement = event.target.closest(mainIconSelector);
		// If the icon exists and the popup isn't opened
		if (iconElement && !isOpen) {
			// Adds popup element on the page with all the styles
			createPopup(popupSelector);
			// Initializes clicker page
			initializeTab(popupSelector, 'clicker');

			isOpen = true;
		}
	});
	
	// When is pressed any mouse button
	$(window).on('click', (event) => {
		// Unique selector of the popup container
		const popupContainerSelector = popupSelector.slice(0, popupSelector.lastIndexOf(' '));
		// If it is left mouse button and checks if the click/touch was outside the popup
		if ((event.which === 1 || event.type === 'touchstart') && $(event.target).is($(popupContainerSelector))) {
			popupClose(popupSelector);
		}
	});
}

/**
 * Initializes the selected tab in the Personal Defender popup.
 * Hides all tabs, displays the chosen tab, highlights the selected tab in navigation,
 * and manages tabindex for accessibility.
 *
 * @param {string} popupSelector - CSS selector of the popup
 * @param {string} tab - The data-tab attribute value indicating the tab to be initialized
*/

function initializeTab(popupSelector, tab) {
	// Hide all tabs
	$(`${popupSelector} .content`).removeClass('active');

	// Show the selected tab
	$(`${popupSelector} .content[data-tab="${tab}"]`).addClass('active');

	// Highlight the selected tab in navigation
	$(`${popupSelector} .navigation .item`).removeClass('active');
	$(`${popupSelector} .navigation .item[data-tab="${tab}"]`).addClass('active');

	// Reset tabindex for all items
	$(`${popupSelector} .navigation .item`).removeAttr('tabindex');

	// Set tabindex="0" for items without the '.active' subclass
	$(`${popupSelector} .navigation .item:not(.active)`).attr('tabindex', '0');
}

/**
 * Sets up tab selection functionality for the Personal Defender popup.
 * Opens the corresponding tab when a navigation item is clicked
 * or focused and the spacebar or enter key is pressed.
 *
 * @param {string} popupSelector - CSS selector of the popup
*/

function chooseTab(popupSelector) {
	// Open the tab on click
	$(document).on('click', `${popupSelector} .navigation .item`, function () {
		var tab = $(this).attr('data-tab');
		initializeTab(popupSelector, tab);
	});

	// Open the tab on focus and press of 'Spacebar' or 'Enter' key
	$(document).on('keydown', `${popupSelector} .navigation .item`, function (event) {
		if (event.code === 'Space' || event.code === 'Enter') {
			var tab = $(this).attr('data-tab');
			initializeTab(popupSelector, tab);
			event.preventDefault();
		}
	});
}

/**
 * Handles the appearance and interaction of the Personal Defender popup.
 *
 * @param {string} popupSelector - CSS selector of the popup
*/

function popupAppearance(popupSelector) {
	// Click event on document to handle checkbox blur
	$(document).on('click', function (event) {
		const $checkbox = $(`${popupSelector} .checkbox`);
		if ($checkbox.length > 0) {
			if (!$checkbox.is(event.target) && !$checkbox.has(event.target).length) {
				$checkbox.blur();
			}
		}
	});

	// Click event on the button to activate/deactivate individual supplies
	$(`${popupSelector} .content[data-tab="clicker"] .supplies .supply`).click(function() {
		if ($(this).attr('data-state') === 'off') {
			$(this).attr('data-state', 'on');
		} else {
			$(this).attr('data-state', 'off');
		}
	});
}

/**
 * Creates and appends the Personal Defender popup to the body.
 * Sets up the necessary styles, initialization, movement,
 * hotkeys, mine delay, and click values for the popup.
 *
 * @param {string} popupSelector - CSS selector of the popup
*/

function createPopup(popupSelector) {
	// HTML markup for the popup container and its contents
	const popupContainer = `<div class="diaphantium popup_container"author=OrakomoRi><div class=popup><button class=close><svg viewBox="0 0 512 512"xmlns=http://www.w3.org/2000/svg><path d="M368 368L144 144M368 144L144 368"fill=none stroke=currentColor stroke-linecap=round stroke-width=32 stroke-linejoin=round /></svg></button><nav class=navigation><div class=item data-tab=clicker><svg viewBox="0 0 512 512"xmlns=http://www.w3.org/2000/svg><path d="M448 225.64v99a64 64 0 01-40.23 59.42l-23.68 9.47A32 32 0 00364.6 417l-10 50.14A16 16 0 01338.88 480H173.12a16 16 0 01-15.69-12.86L147.4 417a32 32 0 00-19.49-23.44l-23.68-9.47A64 64 0 0164 324.67V224c0-105.92 85.77-191.81 191.65-192S448 119.85 448 225.64z"fill=none stroke=currentColor stroke-linecap=round stroke-width=32 stroke-miterlimit=10 /><circle cx=168 cy=280 fill=none r=40 stroke=currentColor stroke-linecap=round stroke-miterlimit=10 stroke-width=32 /><circle cx=344 cy=280 fill=none r=40 stroke=currentColor stroke-linecap=round stroke-miterlimit=10 stroke-width=32 /><path d="M256 336l-16 48h32l-16-48zM256 448v32M208 448v32M304 448v32"fill=none stroke=currentColor stroke-linecap=round stroke-width=32 stroke-linejoin=round /></svg></div><div class=item data-tab=settings><svg viewBox="0 0 512 512"xmlns=http://www.w3.org/2000/svg><path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-15.17 1.75A164.48 164.48 0 01325 400.8a15.94 15.94 0 00-8.82 12.14l-6.73 47.89a11.08 11.08 0 01-10.68 9.17h-85.54a11.11 11.11 0 01-10.69-8.87l-6.72-47.82a16.07 16.07 0 00-9-12.22 155.3 155.3 0 01-21.46-12.57 16 16 0 00-15.11-1.71l-44.89 18.07a10.81 10.81 0 01-13.14-4.58l-42.77-74a10.8 10.8 0 012.45-13.75l38.21-30a16.05 16.05 0 006-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 00-6.07-13.94l-38.19-30A10.81 10.81 0 0149.48 186l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0015.17-1.75A164.48 164.48 0 01187 111.2a15.94 15.94 0 008.82-12.14l6.73-47.89A11.08 11.08 0 01213.23 42h85.54a11.11 11.11 0 0110.69 8.87l6.72 47.82a16.07 16.07 0 009 12.22 155.3 155.3 0 0121.46 12.57 16 16 0 0015.11 1.71l44.89-18.07a10.81 10.81 0 0113.14 4.58l42.77 74a10.8 10.8 0 01-2.45 13.75l-38.21 30a16.05 16.05 0 00-6.05 14.08c.33 4.14.55 8.3.55 12.47z"fill=none stroke=currentColor stroke-linecap=round stroke-width=32 stroke-linejoin=round /></svg></div></nav><div class=content data-tab=clicker><div class=header>Clicker</div><div class=inner><div class=scrollable><div class=supplies><div class=subheader>Chose supplies to click</div><div class=subinner><svg viewBox="0 0 33 33"xmlns=http://www.w3.org/2000/svg class=supply data-key=1 height=33 width=33><path d="M25.4995 1.5L20.9995 6V8L24.9995 12H26.9995L31.4995 7.5H32.9995V10C32.9995 15.5228 28.5224 20 22.9995 20C21.5322 20 20.1386 19.684 18.8833 19.1162L6.99993 30.9999C5.61922 32.3807 3.38061 32.3807 1.99989 31C0.61919 29.6193 0.619177 27.3807 1.99985 26L13.8833 14.1162C13.3156 12.8609 12.9995 11.4673 12.9995 10C12.9995 4.47715 17.4767 0 22.9995 0H25.4995V1.5Z"clip-rule=evenodd fill-rule=evenodd /></svg> <svg viewBox="0 0 32 32"xmlns=http://www.w3.org/2000/svg class=supply data-key=2 height=32 width=32><path d="M29.3585 20.2617C26.6141 28.9674 16 32 16 32C16 32 2 28 2 16V5.5086C2 4.61564 2.59195 3.83087 3.45056 3.58555L16 0L28.5494 3.58555C29.408 3.83087 30 4.61564 30 5.5086V12V16C30 16 30 16 30 16C30 17.5514 29.766 18.9691 29.3585 20.2617ZM26 10.8571V7.01721L16 4.16006L6 7.01721V16C6 20.2091 8.39074 23.1492 11.325 25.2451C12.7793 26.2839 14.2595 27.0272 15.3882 27.5109C15.609 27.6055 15.814 27.6892 16 27.7624L16 8L26 10.8571Z"clip-rule=evenodd fill-rule=evenodd /></svg> <svg viewBox="0 0 32 32"xmlns=http://www.w3.org/2000/svg class=supply data-key=3 height=32 width=32><path d="M4 1.33333L0 26L20 12L6 32L30.6667 28L20 24L32 0L8 12L4 1.33333Z"clip-rule=evenodd fill-rule=evenodd /></svg> <svg viewBox="0 0 32 32"xmlns=http://www.w3.org/2000/svg class=supply data-key=4 height=32 width=32><path d="M2 13.8397C2 12.672 2.51025 11.5626 3.39683 10.8027L16 0L28.6032 10.8027C29.4897 11.5626 30 12.672 30 13.8397V20L16 8L2 20V13.8397Z"/><path d="M2 25.8397C2 24.672 2.51025 23.5626 3.39683 22.8027L16 12L28.6032 22.8027C29.4897 23.5626 30 24.672 30 25.8397V32L16 20L2 32V25.8397Z"/></svg></div></div><div class=click_enable><label class=label><p>Click supplies</p><input class="supplies checkbox"type=checkbox></label></div><div class=mine_delay><label class=label>Delay for mines (ms) <input class="text_input delay"></label></div></div></div></div><div class=content data-tab=settings><div class=header>Settings</div><div class=inner><div class=scrollable><div class=hotkeys><div class=subheader>Hotkeys</div><div class=subinner><div class=hotkey_block><div class=refresh_hotkey data-action="Open menu"><svg viewBox="0 0 487.23 487.23"xmlns=http://www.w3.org/2000/svg><path d="M55.323 203.641a38.907 38.907 0 0 0 35.872-23.854c25.017-59.604 83.842-101.61 152.42-101.61 37.797 0 72.449 12.955 100.23 34.442l-21.775 3.371a16.981 16.981 0 0 0-14.232 14.512 16.983 16.983 0 0 0 9.867 17.768l119.746 53.872a17.012 17.012 0 0 0 16.168-1.205 17.019 17.019 0 0 0 7.796-14.208l.621-131.943a16.977 16.977 0 0 0-12.024-16.332 16.992 16.992 0 0 0-19.104 6.837l-16.505 24.805C370.398 26.778 310.1 0 243.615 0 142.806 0 56.133 61.562 19.167 149.06a39.258 39.258 0 0 0 3.429 36.987 39.265 39.265 0 0 0 32.727 17.594zM464.635 301.184a39.266 39.266 0 0 0-32.728-17.594 38.907 38.907 0 0 0-35.872 23.854c-25.018 59.604-83.843 101.61-152.42 101.61-37.798 0-72.45-12.955-100.232-34.442l21.776-3.369a16.986 16.986 0 0 0 14.233-14.514 16.985 16.985 0 0 0-9.867-17.768L49.779 285.089a17.014 17.014 0 0 0-16.169 1.205 17.017 17.017 0 0 0-7.795 14.207l-.622 131.943a16.976 16.976 0 0 0 12.024 16.332 16.991 16.991 0 0 0 19.104-6.839l16.505-24.805c44.004 43.32 104.303 70.098 170.788 70.098 100.811 0 187.481-61.561 224.446-149.059a39.252 39.252 0 0 0-3.425-36.987z"/></svg></div><label class=label><input class="text_input hotkey"data-action="Open menu"readonly><p class=text>Open menu</label></div><div class=hotkey_block><div class=refresh_hotkey data-action="Click supplies"><svg viewBox="0 0 487.23 487.23"xmlns=http://www.w3.org/2000/svg><path d="M55.323 203.641a38.907 38.907 0 0 0 35.872-23.854c25.017-59.604 83.842-101.61 152.42-101.61 37.797 0 72.449 12.955 100.23 34.442l-21.775 3.371a16.981 16.981 0 0 0-14.232 14.512 16.983 16.983 0 0 0 9.867 17.768l119.746 53.872a17.012 17.012 0 0 0 16.168-1.205 17.019 17.019 0 0 0 7.796-14.208l.621-131.943a16.977 16.977 0 0 0-12.024-16.332 16.992 16.992 0 0 0-19.104 6.837l-16.505 24.805C370.398 26.778 310.1 0 243.615 0 142.806 0 56.133 61.562 19.167 149.06a39.258 39.258 0 0 0 3.429 36.987 39.265 39.265 0 0 0 32.727 17.594zM464.635 301.184a39.266 39.266 0 0 0-32.728-17.594 38.907 38.907 0 0 0-35.872 23.854c-25.018 59.604-83.843 101.61-152.42 101.61-37.798 0-72.45-12.955-100.232-34.442l21.776-3.369a16.986 16.986 0 0 0 14.233-14.514 16.985 16.985 0 0 0-9.867-17.768L49.779 285.089a17.014 17.014 0 0 0-16.169 1.205 17.017 17.017 0 0 0-7.795 14.207l-.622 131.943a16.976 16.976 0 0 0 12.024 16.332 16.991 16.991 0 0 0 19.104-6.839l16.505-24.805c44.004 43.32 104.303 70.098 170.788 70.098 100.811 0 187.481-61.561 224.446-149.059a39.252 39.252 0 0 0-3.425-36.987z"/></svg></div><label class=label><input class="text_input hotkey"data-action="Click supplies"readonly><p class=text>Click supplies</label></div><div class=hotkey_block><div class=refresh_hotkey data-action="Click mines"><svg viewBox="0 0 487.23 487.23"xmlns=http://www.w3.org/2000/svg><path d="M55.323 203.641a38.907 38.907 0 0 0 35.872-23.854c25.017-59.604 83.842-101.61 152.42-101.61 37.797 0 72.449 12.955 100.23 34.442l-21.775 3.371a16.981 16.981 0 0 0-14.232 14.512 16.983 16.983 0 0 0 9.867 17.768l119.746 53.872a17.012 17.012 0 0 0 16.168-1.205 17.019 17.019 0 0 0 7.796-14.208l.621-131.943a16.977 16.977 0 0 0-12.024-16.332 16.992 16.992 0 0 0-19.104 6.837l-16.505 24.805C370.398 26.778 310.1 0 243.615 0 142.806 0 56.133 61.562 19.167 149.06a39.258 39.258 0 0 0 3.429 36.987 39.265 39.265 0 0 0 32.727 17.594zM464.635 301.184a39.266 39.266 0 0 0-32.728-17.594 38.907 38.907 0 0 0-35.872 23.854c-25.018 59.604-83.843 101.61-152.42 101.61-37.798 0-72.45-12.955-100.232-34.442l21.776-3.369a16.986 16.986 0 0 0 14.233-14.514 16.985 16.985 0 0 0-9.867-17.768L49.779 285.089a17.014 17.014 0 0 0-16.169 1.205 17.017 17.017 0 0 0-7.795 14.207l-.622 131.943a16.976 16.976 0 0 0 12.024 16.332 16.991 16.991 0 0 0 19.104-6.839l16.505-24.805c44.004 43.32 104.303 70.098 170.788 70.098 100.811 0 187.481-61.561 224.446-149.059a39.252 39.252 0 0 0-3.425-36.987z"/></svg></div><label class=label><input class="text_input hotkey"data-action="Click mines"readonly><p class=text>Click mines</label></div></div></div></div></div></div></div></div>`;

	// Append the popup container to the body
	$('body').append(popupContainer);

	// Apply styles to the popup container
	popupStyles(popupSelector);

	// Initialize the popup
	elementInitialize(popupSelector, 'Diaphantium.coordinates', 3, 3);

	// Make the popup movable
	elementMove(popupSelector);
	
	// Set up hotkeys for the popup
	setupHotkeys(popupSelector);
	// Set up supply click checkbox for the popup
	setupSupplyClickCheckbox(popupSelector);
	// Set up mine delay functionality
	setupMineDelay(popupSelector);
	// Set up click values for supplies
	setupClickValues(popupSelector);
}

/**
 * Sets up CSS rules for various elements within the popup.
 *
 * @param {string} popupSelector - CSS selector of the popup
*/

function popupStyles(popupSelector) {
	// CSS rules to reset styles for consistent rendering
	const popupReset = $('<style>').html(`.popup_container.diaphantium[author=OrakomoRi],.popup_container.diaphantium[author=OrakomoRi] *{margin:0;padding:0;border:none;outline:0;box-sizing:border-box;-webkit-user-select:none;-moz-user-select:none;user-select:none;font-family:sans-serif;background:0 0;color:inherit}.popup_container.diaphantium[author=OrakomoRi] button{outline:0;border:none;background:0 0;overflow:visible;font:inherit;line-height:normal;-webkit-font-smoothing:inherit;-moz-osx-font-smoothing:inherit;appearance:none;border-radius:0}.popup_container.diaphantium[author=OrakomoRi] button::-moz-focus-inner{border:0;padding:0}`);
	// CSS rules for the popup styling
	const popupStyles = $('<style>').html(`.popup_container.diaphantium[author=OrakomoRi]{position:absolute;top:0;left:0;width:100%;height:100%;z-index:888;-webkit-box-align:center;-webkit-box-pack:center;display:flex;justify-content:center;align-items:center}.popup_container.diaphantium[author=OrakomoRi] .popup{position:absolute;display:flex;width:30em;height:20em;border-radius:.25em;padding:1em 2.5em 1em .5em;gap:2em;background:rgba(var(--diaphantium-background),var(--diaphantium-opacity));-webkit-backdrop-filter:blur(var(--diaphantium-blur));backdrop-filter:blur(var(--diaphantium-blur));border:.1em solid rgba(255,255,255,calc(var(--diaphantium-opacity) * 1.5));box-shadow:0 0 2em 0 rgba(255,255,255,.2);color:#fff;z-index:889}.popup_container.diaphantium[author=OrakomoRi] .content{display:none;flex-direction:column;align-items:center;gap:1em;flex-grow:1}.popup_container.diaphantium[author=OrakomoRi] .content.active{display:flex}.popup_container.diaphantium[author=OrakomoRi] .close{position:absolute;top:.5em;right:.5em;cursor:pointer;color:#fff;height:2em;width:2em;transition:color var(--diaphantium-transition)}.popup_container.diaphantium[author=OrakomoRi] .close:hover{color:#ff4646}.popup_container.diaphantium[author=OrakomoRi] .header{display:flex;align-items:center;justify-content:center;font-size:1.5em;font-weight:700}.popup_container.diaphantium[author=OrakomoRi] .inner{display:flex;flex-direction:column;justify-content:center;gap:1em;flex-grow:1;padding:.5em 1em;overflow:hidden}.popup_container.diaphantium[author=OrakomoRi] .subheader{font-size:1.2em;font-weight:700}.popup_container.diaphantium[author=OrakomoRi] .popup .scrollable{display:flex;flex-direction:column;gap:1em;padding:1em 2em;overflow:hidden auto}.popup_container.diaphantium[author=OrakomoRi] .popup .scrollable::-webkit-scrollbar-track{background:0 0}.popup_container.diaphantium[author=OrakomoRi] .popup .scrollable::-webkit-scrollbar{width:.5em;background:rgba(255,255,255,.2);border-radius:.25em}.popup_container.diaphantium[author=OrakomoRi] .popup .scrollable::-webkit-scrollbar-thumb{background-color:#5a5a5a;border-radius:.25em}.popup_container.diaphantium[author=OrakomoRi] .popup .scrollable::-webkit-scrollbar-thumb:hover{background-color:#787878}.popup_container.diaphantium[author=OrakomoRi] .inner .label{display:flex;align-items:center;gap:.5em}.popup_container.diaphantium[author=OrakomoRi] .text_input{padding:.2em .5em;background-color:rgb(var(--diaphantium-background-primary));color:#fff;text-align:center;border:.1em solid rgb(var(--diaphantium-accent));font-size:1em;border-radius:.2em;transition:all var(--diaphantium-transition)}.popup_container.diaphantium[author=OrakomoRi] .popup .checkbox{-webkit-appearance:none;-moz-appearance:none;appearance:none;font:inherit;background-color:rgb(var(--diaphantium-background-primary));color:rgb(var(--diaphantium-background-primary));width:1.2em;height:1.2em;box-shadow:0 0 0 .1em rgb(var(--diaphantium-accent));border-radius:.2em;cursor:pointer;display:flex;justify-content:center;align-items:center}.popup_container.diaphantium[author=OrakomoRi] .popup .checkbox::before{content:"";width:.8em;height:.8em;border-radius:.2em;background-color:rgb(var(--diaphantium-accent));transform:scale(0);transition:all var(--diaphantium-transition)}.popup_container.diaphantium[author=OrakomoRi] .popup .checkbox:checked::before{transform:scale(1)}.popup_container.diaphantium[author=OrakomoRi] .popup .checkbox:focus-visible{box-shadow:0 0 0 .1em rgb(var(--diaphantium-accent)),0 0 0 .2em rgb(var(--diaphantium-active))}.popup_container.diaphantium[author=OrakomoRi] .popup .checkbox:disabled{box-shadow:0 0 0 .1em #aaa}.popup_container.diaphantium[author=OrakomoRi] .popup .checkbox:checked:disabled::before{background-color:#aaa}.popup_container.diaphantium[author=OrakomoRi] .navigation{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1em}.popup_container.diaphantium[author=OrakomoRi] .navigation .item{border-radius:.2em;padding:.5em;cursor:pointer;width:2.5em;height:2.5em;transition:color var(--diaphantium-transition),background-color var(--diaphantium-transition)}.popup_container.diaphantium[author=OrakomoRi] .navigation .item:focus,.popup_container.diaphantium[author=OrakomoRi] .navigation .item:hover{color:rgb(var(--diaphantium-accent))}.popup_container.diaphantium[author=OrakomoRi] .navigation .item.active{pointer-events:none;background-color:rgba(255,255,255,.25)}.popup_container.diaphantium[author=OrakomoRi] .supplies{display:flex;flex-direction:column;align-items:center;gap:1em;font-size:1em;font-weight:700}.popup_container.diaphantium[author=OrakomoRi] .supplies .subinner{display:flex;gap:1em}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply{width:1.5em;cursor:pointer;fill:#969696;transition:all var(--diaphantium-transition)}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-key="1"]:hover{fill:#94a059}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-key="2"]:hover{fill:#a39c74}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-key="3"]:hover{fill:#9b4343}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-key="4"]:hover{fill:#a4a448}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-state=on][data-key="1"]{fill:#bfe500}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-state=on][data-key="2"]{fill:#eadc99}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-state=on][data-key="3"]{fill:#f33}.popup_container.diaphantium[author=OrakomoRi] .supplies .supply[data-state=on][data-key="4"]{fill:#ff0}.popup_container.diaphantium[author=OrakomoRi] .click_enable{align-self:center}.popup_container.diaphantium[author=OrakomoRi] .text_input:focus{border-color:rgb(var(--diaphantium-active))}.popup_container.diaphantium[author=OrakomoRi] .mine_delay .text_input.delay{width:4em}.popup_container.diaphantium[author=OrakomoRi] .content[data-tab=settings] .subinner{display:flex;flex-direction:column;gap:.5em}.popup_container.diaphantium[author=OrakomoRi] .content[data-tab=settings] .hotkeys{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1.5em}.popup_container.diaphantium[author=OrakomoRi] .hotkeys .hotkey_block{display:flex;align-items:center;gap:.5em;padding:.2em 1em}.popup_container.diaphantium[author=OrakomoRi] .hotkeys .refresh_hotkey{height:1.5em;width:1.5em;fill:#969696;cursor:pointer}.popup_container.diaphantium[author=OrakomoRi] .hotkeys .refresh_hotkey:hover{fill:#fff}.popup_container.diaphantium[author=OrakomoRi] .hotkeys .refresh_hotkey svg{width:100%;height:100%}.popup_container.diaphantium[author=OrakomoRi] .hotkeys .text_input.hotkey{cursor:pointer;font-weight:700;width:5rem}.popup_container.diaphantium[author=OrakomoRi] .hotkeys .text{font-size:1em}.popup_container.diaphantium[author=OrakomoRi] .text_input.warning{border-color:#e1ff32}.popup_container.diaphantium[author=OrakomoRi] .text_input.warning:focus{border-color:rgb(var(--diaphantium-active))}.popup_container.diaphantium[author=OrakomoRi] .text_input.wrong_input{user-select:none;border-color:#ff3232;animation:shake .2s cubic-bezier(.36,.07,.19,.97) both}@keyframes shake{10%,90%{transform:translate3d(-.1rem,0,0)}20%,80%{transform:translate3d(.2rem,0,0)}30%,50%,70%{transform:translate3d(-.4rem,0,0)}40%,60%{transform:translate3d(.4rem,0,0)}}`);
	// CSS rules for custom variables
	const popupVariables = $('<style>').html(`:root{--diaphantium-background:0,0,0;--diaphantium-opacity:.4;--diaphantium-blur:.5em;--diaphantium-accent:97,181,255;--diaphantium-active:81,221,97;--diaphantium-inactive:221,81,81;--diaphantium-background-primary:50,50,50;--diaphantium-transition:.3s ease}`);

	
	// Append the generated styles to the popup container
	const popupContainerSelector = popupSelector.slice(0, popupSelector.lastIndexOf(' '));
	$(popupContainerSelector).append(popupReset);
	$(popupContainerSelector).append(popupStyles);
	$(popupContainerSelector).append(popupVariables);
}

// INPUTS

/**
 * Sets up (supply) click values configuration functionality for the specified popup.
 * 
 * @param {string} popupSelector - CSS selector of the popup
*/

function setupClickValues(popupSelector) {
	// Saves click values configuration to local storage
	function saveClickValues(popupSelector) {
		let values = [];

		// Iterate over each supply checkbox in the UI
		$(`${popupSelector} .supplies .supply`).each(function () {
			var checkbox = {
				key: $(this).attr('data-key'),
				value: $(this).attr('data-state')
			};
			values.push(checkbox);
		});

		// Store click values in local storage as JSON
		localStorage.setItem('Diaphantium.clickValues', JSON.stringify(values));
	}

	// Loads click values configuration from local storage and updates the UI
	function loadClickValues(popupSelector) {
		// Retrieve click values array from local storage
		var values = JSON.parse(localStorage.getItem('Diaphantium.clickValues'));

		// Check if click values exist and are an array
		if (values && Array.isArray(values)) {
			// Iterate over each supply checkbox in the UI
			$(`${popupSelector} .supplies .supply`).each(function () {
				var $input = $(this);
				var key = $input.attr('data-key');

				// Find the corresponding click value object in the array
				var click = values.find(function (item) {
					return item.key === key;
				});

				// Update the UI with the loaded click value or set a default if not found
				var value = click ? click.value : 'off';
				$input.attr('data-state', value);
			});
			// Save updated click values to local storage
			saveClickValues(popupSelector);
		} else { // If no click values are found in local storage, set default values
			$(`${popupSelector} .supplies .supply`).each(function () {
				$(this).attr('data-state', 'off');
			});
			// Save default click values to local storage
			saveClickValues(popupSelector);
		}
	}

	$(`${popupSelector} .supplies .supply`).click(function() {
		var $input = $(this);
		var currentValue = $input.attr('data-state');
		var newValue = (currentValue === 'on') ? 'off' : 'on';

		// Toggle the click value state and save to local storage
		$input.attr('data-state', newValue);
		saveClickValues(popupSelector);
	});

	loadClickValues(popupSelector);
}

/**
 * Function to set up the click checkbox for supplies with state saving and loading.
 * 
 * @param {string} popupSelector - CSS selector of the popup
*/

function setupSupplyClickCheckbox(popupSelector) {
	function saveSupplyClickCheckbox() {
		localStorage.setItem('Diaphantium.clickSuppliesState', $clickSuppliesCheckbox.prop('checked').toString());
	}

	function loadSupplyClickCheckbox() {
		// Check the state of the checkbox in local storage and set it
		var storedState = localStorage.getItem('Diaphantium.clickSuppliesState');

		if (storedState) {
			$clickSuppliesCheckbox.prop('checked', storedState === 'true');
		}
	}
	
	// Get the "Click supplies" checkbox element
	var $clickSuppliesCheckbox = $(`${popupSelector} .click_enable .checkbox.supplies`);

	// Load the checkbox state from local storage
	loadSupplyClickCheckbox();

	// Change event handler for the checkbox
	$clickSuppliesCheckbox.on('change', function() {
		// Save the current state of the checkbox to local storage
		saveSupplyClickCheckbox();
	});
}

/**
 * Sets up functionality to manage mine delay settings in the specified popup.
 * @param {string} popupSelector - CSS selector of the popup
*/

function setupMineDelay(popupSelector) {
	// Saves mine delay values to local storage
	function saveMineDelay(popupSelector) {
		var mineDelayValues = $(`${popupSelector} .content[data-tab="clicker"] .text_input.delay`).map(function () {
			return $(this).val();
		}).get();
	
		localStorage.setItem('Diaphantium.mine_delay', JSON.stringify(mineDelayValues));
	}

	// Loads mine delay values from local storage and updates the UI
	function loadMineDelay(popupSelector) {
		var mineDelayValues = JSON.parse(localStorage.getItem('Diaphantium.mine_delay'));
	
		if (mineDelayValues && Array.isArray(mineDelayValues)) {
			$(`${popupSelector} .content[data-tab="clicker"] .text_input.delay`).each(function (index) {
				$(this).val(mineDelayValues[index]);
			});
		} else {
			$(`${popupSelector} .content[data-tab="clicker"] .text_input.delay`).val(100);
			saveMineDelay(popupSelector);
		}
	}

	// Initial load of mine delay values
	loadMineDelay(popupSelector);

	// Selector and element on UI side
	const delaySelector = `${popupSelector} .content[data-tab="clicker"] .text_input.delay`;
	const $delay = $(delaySelector);
	var previousValue = $delay.val();

	$(document).click(function (event) {
		// Blur input when clicking outside of the delay input field
		if ($delay.length > 0) {
			if (!$(event.target).closest(delaySelector).length) {
				$delay.blur();
			}
		}
	});

	$delay.keydown(function(event) {
		// Blur input when 'Enter' key is pressed
		if (event.code === 'Enter') {
			$(this).blur();
		}
	}).click(function() {
		// Focus on input when clicked
		$(this).focus();
	}).change(function() {
		// Validate and save new value on change (takes only numbers)
		var newValue = $(this).val();
		if (!/^\d+$/.test(newValue)) { // If incorrect input value
			// Add red border, shake effect, and make unclickable for 200ms
			$delay.addClass(`wrong_input`);
			setTimeout(function () {
				// Remove red border, shake effect, and make clickable again after 200ms
				$delay.removeClass('wrong_input');
				$delay.val(previousValue);
			}, 200);
		} else { // Else if everything OK
			previousValue = newValue;
			saveMineDelay(popupSelector);
		}
	});
}

/**
 * Sets up hotkey configuration functionality for the specified popup.
 * @param {string} popupSelector - CSS selector of the popup
*/

function setupHotkeys(popupSelector) {
	// Saves hotkey configuration to local storage
	function saveHotkeys(popupSelector) {
		let hotkeys = [];
	
		// Iterate over each hotkey input field
		$(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`).each(function () {
			var $input = $(this);
			const action = $input.attr('data-action');
			var value = $input.attr('data-code');
	
			// Create a hotkey object and add it to the array
			var hotkey = {
				action: action,
				value: value
			};
	
			hotkeys.push(hotkey);
		});
	
		// Store hotkeys in local storage as JSON
		localStorage.setItem('Diaphantium.hotkeys', JSON.stringify(hotkeys));
	}
	
	// Loads hotkey configuration from local storage and updates the UI
	function loadHotkeys(popupSelector) {
		// Retrieve hotkeys array from local storage
		var hotkeys = JSON.parse(localStorage.getItem('Diaphantium.hotkeys'));
	
		// Check if hotkeys exist and are an array
		if (hotkeys && Array.isArray(hotkeys)) {
			// Iterate over each hotkey input field in the UI
			$(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`).each(function () {
				var $input = $(this);
				const action = $input.attr('data-action');
	
				// Find the corresponding hotkey object in the array
				var hotkey = hotkeys && hotkeys.find(function(item) {
					return item.action === action;
				});
	
				// Update the UI with the loaded hotkey or set a default if not found
				if (hotkey) {
					$input.attr('data-code', hotkey.value);
					$input.val(hotkey.value);
				} else if (action === 'Open menu') {
					$input.attr('data-code', 'Slash');
					$input.val('Slash');
					saveHotkeys(popupSelector);
				}
			});
		} else { // If no hotkeys are found in local storage, set default values
			$(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`).each(function () {
				var $input = $(this);
				const action = $input.attr('data-action');
				if (action === 'Open menu') {
					$input.attr('data-code', 'Slash');
					$input.val('Slash');
					saveHotkeys(popupSelector);
				}
			});
		}
	}

	// Check for duplicate hotkeys
	function updateHotkeysClasses(popupSelector) {
		const hotkeyInputs = $(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`);

		// Remove existing warnings
		hotkeyInputs.removeClass('warning');

		// Iterate through each hotkey input
		hotkeyInputs.each(function () {
			const currentValue = $(this).val();

			// Check if the value is not empty
			if (currentValue !== null && currentValue !== '') {
				// Check if there are other hotkeys with the same value
				const duplicates = hotkeyInputs.filter(function () {
					return $(this).val() === currentValue;
				});
	
				// Add warning class if duplicates are found
				if (duplicates.length > 1) {
					duplicates.addClass('warning');
				}
			}
		});
	}

	// Initial load of hotkey configuration
	loadHotkeys(popupSelector);

	// Selector and element
	const hotkeysSelector = `${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey`;
	const $hotkey = $(hotkeysSelector);

	$(document).click(function (event) {
		// Blur input when clicking outside of the hotkey input field
		if ($hotkey.length > 0) {
			if (!$(event.target).closest(hotkeysSelector).length) {
				$hotkey.blur();
			}
		}
	});

	// Click refresh hotkey button
	$(document).on('click', `${popupSelector} .content[data-tab="settings"] .hotkeys .refresh_hotkey`, function() {
		// Check for which action the button is set
		var action = $(this).attr('data-action');
		// Search that input
		var $input = $(`${popupSelector} .content[data-tab="settings"] .hotkeys .hotkey[data-action="${action}"]`);
		if ($input.length > 0) {
			// Check if action is "Open menu"
			if (action === 'Open menu') {
				// Set value to "Slash" in this case
				$input.val('Slash');
				$input.attr('data-code', 'Slash');
			} else {
				// If Escape key is pressed, clear the hotkey
				$input.val('');
				$input.removeAttr('data-code');
			}
			updateHotkeysClasses(popupSelector);
			saveHotkeys(popupSelector); // Save hotkeys
		}
	});

	$hotkey.click(function () {
		// Focus on input when clicked
		$(this).focus();
	}).keydown(function (event) {
		// Update and save hotkey value on keypress
		var $input = $(this);		
		var code = event.code;

		var previousValue = $input.val(); // Store the previous value

		if (code === "Escape") {
			const action = $input.attr('data-action');
			// Check if action is "Open menu"
			if (action === 'Open menu') {
				// Set value to "Slash" in this case
				$input.val('Slash');
				$input.attr('data-code', 'Slash');
			} else {
				// If Escape key is pressed, clear the hotkey
				$input.val('');
				$input.removeAttr('data-code');
			}
		} else  {
			// Check if the pressed key is in the range of Digit1 to Digit5
			var isInRange = /^Digit[1-5]$/.test(code);

			if (isInRange) {
				// Add red border, shake effect, and make unclickable for 200ms
				$input.addClass(`wrong_input`);
				setTimeout(function () {
					// Remove red border, shake effect, and make clickable again after 200ms
					$input.removeClass('wrong_input');
					$input.val(previousValue);
				}, 200);
			} else {
				$input.val(code);
				$input.attr('data-code', code);
			}
		}

		event.preventDefault();
		$input.blur(); // Remove focus from input field
		updateHotkeysClasses(popupSelector);
		saveHotkeys(popupSelector); // Save hotkeys
	});
}

/**
 * Detects if the device is a mobile device and adds click icons accordingly
 * It also removes click icons when the device is resized to a non-mobile size
 * 
 * @param {string} popupSelector - CSS selector of the popup
*/

function mobileIcon(popupSelector) {
	/**
	 * Function to check if the device is a mobile device.
	 *
	 * @returns {boolean} - True if the device is a mobile device, false otherwise
	*/
	function isMobileDevice() {
		// See on https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#mobile_device_detection
		var hasTouchScreen = false;
		if ('maxTouchPoints' in navigator) { // Check if the 'maxTouchPoints' property exists in the navigator object
			hasTouchScreen = navigator.maxTouchPoints > 0;
		} else if ('msMaxTouchPoints' in navigator) { // Check if the 'msMaxTouchPoints' property exists in the navigator object
			hasTouchScreen = navigator.msMaxTouchPoints > 0;
		} else { // Check using matchMedia to see if the device has a coarse pointer
			const mQ = matchMedia?.('(pointer:coarse)');
			if (mQ?.media === '(pointer:coarse)') {
				hasTouchScreen = !!mQ.matches;
			} else if ('orientation' in window) { // Check if the 'orientation' property exists in the window object
				hasTouchScreen = true; // deprecated, but good fallback
			} else { // Parse the user agent string to identify specific mobile devices
				const UA = navigator.userAgent;
				hasTouchScreen =
					/\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
					/\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA);
			}
		}

		return hasTouchScreen ? true : false;
	}

	/**
	 * Function to add icons for mobile devices
	*/
	function addClickIcons() {
		// Check if there are already icons added to the body
		if ($('.diaphantium_mobile.icon[author="OrakomoRi"]').length > 0) {
			return;
		}

		// Create a <div> element to contain styles for the icons and append it to the body
		const iconStylesDiv = $(`<div author="OrakomoRi" class="diaphantium_mobile styles"><style>.diaphantium_mobile.icon[author=OrakomoRi]{z-index:777;bottom:0;left:0;position:absolute}.diaphantium_mobile.icon[author=OrakomoRi].main{width:3em;height:3em}.diaphantium_mobile.icon[author=OrakomoRi].mines,.diaphantium_mobile.icon[author=OrakomoRi].supplies{width:2.5em;height:2.5em;fill:rgb(100,100,100)}.diaphantium_mobile.icon[author=OrakomoRi].supplies.active{fill:rgb(255,51,51)}.diaphantium_mobile.icon[author=OrakomoRi].mines.active{fill:rgb(54,178,74)}.diaphantium_mobile[author=OrakomoRi].styles{position:absolute;height:1px;width:1px;overflow:hidden;clip:rect(0 0 0 0)}</style></div>`)
		$('body').append(iconStylesDiv);

		// Array of objects representing different icons with their classes and SVG markup
		const icons = [
			{ class: 'main', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63z" stroke="#AFAFAF" stroke-linecap="round" stroke-linejoin="round" stroke-width="64"/><path d="M463.1 112.37C373.68 96.33 336.71 84.45 256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464c15.42-6.21 223.3-94.87 207.1-351.63z"/><path fill="#FFF" d="M256 48c-80.71 36.45-117.68 48.33-207.1 64.37C32.7 369.13 240.58 457.79 256 464z"/><g fill="#646464"><path d="M81.244 111.914a75.113 75.113 0 0 0 17.27-12.885c5.429-5.435 9.858-11.595 13.353-18.2 4.177-7.892 13.125-1.654 13.125-1.654 12.29 8.078 24.638 15.444 35.396 21.534l40.852-40.885V20.132c0-7.633 6.193-13.821 13.828-13.821 7.632 0 13.825 6.188 13.825 13.821v45.407c0 3.675-1.456 7.188-4.046 9.78L75.587 224.731a13.836 13.836 0 0 1-9.78 4.05H20.179c-7.638 0-13.82-6.189-13.82-13.824 0-7.642 6.18-13.832 13.82-13.832h39.897l40.67-40.723c-6.488-10.991-14.441-23.768-23.188-36.428.004-.001-5.159-7.253 3.686-12.06zM92.572 46.568c0-12.436-4.837-24.122-13.622-32.921C70.173 4.863 58.499.028 46.088.028c-12.42 0-24.083 4.837-32.858 13.619C4.452 22.444-.39 34.132-.394 46.567c0 12.429 4.848 24.117 13.624 32.908 8.776 8.79 20.444 13.632 32.858 13.632 12.413 0 24.087-4.844 32.862-13.632 8.785-8.789 13.622-20.479 13.622-32.907zM188.443 176.724c-6.123-6.129-6.123-16.156-.001-22.285l15.401-15.417c6.122-6.129 16.14-6.129 22.262 0l262.908 263.184c6.122 6.128 11.772 18.202 12.556 26.828l5.866 64.508c.784 8.628-5.631 15.043-14.259 14.259l-64.384-5.855c-8.627-.784-20.694-6.44-26.817-12.569l-262.94-263.2c-6.12-6.128-6.12-16.156 0-22.284l15.423-15.439c6.122-6.128 16.14-6.128 22.264 0l220.155 220.36a8.284 8.284 0 0 0 11.729.005c3.243-3.234 3.243-8.493.003-11.74z"/></g></svg>` },
			{ class: 'supplies', svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 1.33333L0 26L20 12L6 32L30.6667 28L20 24L32 0L8 12L4 1.33333Z"/></svg>` },
			{ class: 'mines', svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 21.0098V10.9902L10.9902 4H21.0098L28 10.9902V21.0098L21.0098 28H10.9902L4 21.0098ZM8.74755 0.585786C9.12262 0.210713 9.63133 0 10.1618 0H21.8382C22.3687 0 22.8774 0.210714 23.2525 0.585787L31.4142 8.74755C31.7893 9.12262 32 9.63133 32 10.1618V21.8382C32 22.3687 31.7893 22.8774 31.4142 23.2525L23.2525 31.4142C22.8774 31.7893 22.3687 32 21.8382 32H10.1618C9.63133 32 9.12262 31.7893 8.74755 31.4142L0.585786 23.2525C0.210713 22.8774 0 22.3687 0 21.8382V10.1618C0 9.63133 0.210714 9.12262 0.585786 8.74755L8.74755 0.585786ZM16 23C19.866 23 23 19.866 23 16C23 12.134 19.866 9 16 9C12.134 9 9 12.134 9 16C9 19.866 12.134 23 16 23Z"/></svg>` },
		];

		/**
		 * Iterate over the array of icons, create a <div> element for each icon,
		 * append it to the body, and initialize its position and behavior.
		*/
		for (const icon of icons) {
			const iconDiv = $(`<div author="OrakomoRi" class="diaphantium_mobile icon ${icon.class}">${icon.svg}</div>`);
			$('body').append(iconDiv);

			// Setup the default appearance to elements
			elementMove(`.diaphantium_mobile.icon[author="OrakomoRi"].${icon.class}`);
			elementInitialize(`.diaphantium_mobile.icon[author="OrakomoRi"].${icon.class}`, `Diaphantium.mobile`, 1, 1, icon.class);

			// If the icon class is 'supplies' or 'mines', add a click event listener to toggle its 'active' class
			if (icon.class === 'supplies' || icon.class === 'mines') {
				iconDiv.click(function() {
					iconDiv.toggleClass('active');
				});
			}
		}
	}

	/**
	 * Function to remove click icons when the device is resized to a non-mobile size
	*/
	function removeClickIcons() {
		// Retrieve all icons
		const clickIcons = $('.diaphantium_mobile.icon[author="OrakomoRi"]');

		// Object mapping icon classes to their corresponding types
		var classTypeMap = {
			'main' : 'main',
			'supplies': 'supplies',
			'mines': 'mines'
		};

		// Iterate over each icon element
		for (icon of clickIcons) {
			// Find the type of the current icon by checking its class against the classTypeMap keys
			var type = Object.keys(classTypeMap).find(function(className) {
				return $(icon).hasClass(className);
			});

			if (type) {
				// If the type is found, retrieve the current coordinates of the icon
				var currentCoordinates = {
					top: parseFloat($(icon).css('top')),
					left: parseFloat($(icon).css('left'))
				};
	
				// Get existing data from local storage
				var existingData = JSON.parse(localStorage.getItem('Diaphantium.mobile')) || {};

				// Update or add coordinates for the current icon
				existingData[classTypeMap[type]] = {
					icon: classTypeMap[type],
					coords: currentCoordinates
				};
		
				// Save updated data to local storage
				localStorage.setItem('Diaphantium.mobile', JSON.stringify(existingData));
			}
			
			// Remove the current icon element from the DOM
			$(icon).remove();
		}

		// Remove the styles for that icons <div> element from the DOM
		$('.diaphantium_mobile.styles[author="OrakomoRi"]').remove();
	}

	// Check if the device is a mobile device and add click icons accordingly
	if (isMobileDevice()) {
		addClickIcons();
	}

	// Handle window resize event to add or remove click icons based on device type
	$(window).on('resize', function() {
		if (isMobileDevice()) {
			addClickIcons();
		} else {
			removeClickIcons();
		}
	});
}



/**
 * Initializes the Personal Defender popup when the document is fully loaded.
*/

$(document).ready(function() {
	// Define the CSS selector for the Personal Defender popup
	const popupSelector = '.popup_container.diaphantium[author="OrakomoRi"] .popup';

	// Toggle the popup's visibility
	popupToggle(popupSelector);
	// Set up the initial appearance of the popup
	popupAppearance(popupSelector);
	// Set the function that is executed when a tab is selected
	chooseTab(popupSelector);

	mobileIcon(popupSelector);

	// Set up clicker functionality for the popup
	clicker(popupSelector);
});