/**
 * Function for element moving logic function.
 * The "selector" if full css unique selector of element.
 * The function can be used for any element, feel free to use it.
 * 
 * Position 'absolute' is mandatory for draggable element.
 * 
 * Check the 'onMoveStart' function to use your own list of elements
 * by which the element cannot be moved.
 * 
 * @param {string} elementSelector - CSS selecter of the element
*/

function elementMove(elementSelector) {
	// Popup window chosen by it's selector
	const $element = $(elementSelector);

	// Coords of top left corner of the popup
	var popupOffsetX = parseFloat($element.css('left'));
	var popupOffsetY = parseFloat($element.css('top'));

	// Previous coords
	let prevPopupOffsetX;
	let prevPopupOffsetY;

	// Initial cursor coords
	let initialX;
	let initialY;

	// Previous window width and height (by default taken at start)
	let prevWindowWidth = $(window).width();
	let prevWindowHeight = $(window).height();

	// Function to move popup
	const updatePopupPosition = function () {
		// Current window width and height
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();

		// Maybe it is the change of orientation
		if (windowWidth !== prevWindowHeight && windowHeight !== prevWindowWidth) {
			// Has the window size increased or decreased
			var isSizeIncreased = windowWidth > prevWindowWidth || windowHeight > prevWindowHeight;
		} else {
			// Max cords that the top left corner can have
			var maxX = windowWidth - $element.outerWidth();
			var maxY = windowHeight - $element.outerHeight();

			// Limit the position within the window
			popupOffsetX = Math.min(Math.max(popupOffsetX, 0), maxX);
			popupOffsetY = Math.min(Math.max(popupOffsetY, 0), maxY);
		}

		if (isSizeIncreased) {
			// Move only if there is previous coords of the top left corner
			if (prevPopupOffsetX !== undefined && prevPopupOffsetY !== undefined) {
				// Coefficient
				var scaleX = Math.abs(windowWidth / prevWindowWidth);
				var scaleY = Math.abs(windowHeight / prevWindowHeight);

				// Updated coords
				popupOffsetX = prevPopupOffsetX * scaleX;
				popupOffsetY = prevPopupOffsetY * scaleY;
			}
		} else {
			// Max cords that the top left corner can have
			var maxX = windowWidth - $element.outerWidth();
			var maxY = windowHeight - $element.outerHeight();

			// Limit the position within the window
			popupOffsetX = Math.min(Math.max(popupOffsetX, 0), maxX);
			popupOffsetY = Math.min(Math.max(popupOffsetY, 0), maxY);
		}

		// Apply new coords
		$element.css('top', `${popupOffsetY}px`);
		$element.css('left', `${popupOffsetX}px`);

		// Current coords as previous
		prevPopupOffsetX = popupOffsetX;
		prevPopupOffsetY = popupOffsetY;

		// Current window size as previous
		prevWindowWidth = windowWidth;
		prevWindowHeight = windowHeight;
	};

	// Variable to decide if the popup should be moving right now
	let isDragging = false;

	// Dragging should be started
	const onMoveStart = function (event) {
		// Take position of the touch/cursor
		const pageX = event.pageX || event.targetTouches[0].pageX;
		const pageY = event.pageY || event.targetTouches[0].pageY;

		// Target on where the mouse button was pressed
		const $target = $(event.target);

		// Popup should be moved right now
		let isDraggable = true;

		// Items by which the popup cannot be moved
		if (
			$target.is('input') ||
			$target.is('a') ||
			$target.closest('button').length > 0 ||
			$target.closest('label').length > 0 ||
			$target.closest(`${elementSelector} .supply`).length > 0 ||
			$target.closest(`${elementSelector} .close`).length > 0 ||
			$target.closest(`${elementSelector} .navigation .item`).length > 0
		) {
			isDraggable = false;
		}

		if (isDraggable) {
			// The popup is moving
			isDragging = true;

			// Cursor coords
			initialX = pageX - $element.offset().left;
			initialY = pageY - $element.offset().top;

			// Event catch & function
			$(document).on('mousemove touchmove', onMove);
			$(document).on('mouseup touchend', onMoveEnd);
		}
	};

	// When touch/mouse is moved
	const onMove = function (event) {
		// If popup should be moved
		if (isDragging) {
			// Check if event has targetTouches (for touch events)
			const touch = event.targetTouches ? event.targetTouches[0] : null;

			// Take position of the touch/cursor
			const pageX = touch ? touch.pageX : event.pageX;
			const pageY = touch ? touch.pageY : event.pageY;

			popupOffsetX = pageX - initialX;
			popupOffsetY = pageY - initialY;

			// Update popup position
			updatePopupPosition();
		}
	};

	// Event when popup ends moving
	const onMoveEnd = function () {
		// The popup should not be moved
		isDragging = false;

		// Event catch & function
		$(document).off('mousemove touchmove', onMove);
		$(document).off('mouseup touchend', onMoveEnd);
	};

	// Apply moving to both touches and mouse events (PC & mobile)
	$element.on('mousedown touchstart', onMoveStart);

	// Windows dimensions changed
	$(window).on('resize orientationchange', function () {
		updatePopupPosition();
	});
}

/**
 * Initializes the element, including
 * handling its position and saving/loading coordinates.
 *
 * @param {string} elementSelector - CSS selector of the element
 * @param {string} item - Name of the item from the localStorage to save the coordinates
 * @param {number} defaultXem - Default X coordinate value (check the code for more info)
 * @param {number} defaultYem - Default Y coordinate value (check the code for more info)
 * @param {string|null} [iconClass=null] - Optional. Class of the icon associated with the element
*/

function elementInitialize(elementSelector, item, defaultXem, defaultYem, iconClass = null) {
	var $element = $(elementSelector);

	// Retrieve element dimensions
	var elementWidth = $element.outerWidth();
	var elementHeight = $element.outerHeight();

	// Window dimensions
	var windowWidth = $(window).width();
	var windowHeight = $(window).height();

	// Maximum possible coordinates
	var maxX = windowWidth - elementWidth;
	var maxY = windowHeight - elementHeight;

	// Check for saved coordinates in local storage
	if (localStorage.getItem(item)) {
		var savedItem = JSON.parse(localStorage.getItem(item));

		// If provided, the function will save and load coordinates based on the specified icon class
		if (iconClass !== null) {
			if (savedItem[iconClass]) {
				savedItem = savedItem[iconClass].coords;
			}
		}

		// If not provided (or set to null), the function will save and load coordinates without considering the icon class

		// Check if saved coordinates are within window boundaries
		if (isValidCoordinates(savedItem)) {
			applyCoordinatesToElement(savedItem);
		} else { // If coordinates are not valid, set default coordinates
			applyDefaultCoordinates();
		}
	} else { // If coordinates are not saved, set default coordinates
		applyDefaultCoordinates();
	}

	function isValidCoordinates(coordinates) {
		// Restrict element position within window boundaries

		return (
			coordinates &&
			!isNaN(coordinates.top) && coordinates.top >= 0 && coordinates.top <= maxY &&
			!isNaN(coordinates.left) && coordinates.left >= 0 && coordinates.left <= maxX
		);
	}

	// Function to apply coordinates to the element
	function applyCoordinatesToElement(coordinates) {
		$element.css({
			'top': `${coordinates.top}px`,
			'left': `${coordinates.left}px`
		});
	}

	// Function to apply default coordinates
	function applyDefaultCoordinates() {
		$element.css({
			'top': `${defaultXem}em`,
			'left': `${defaultYem}em`
		});
	}

	// Function to save coordinates before unloading the page
	$(window).on('beforeunload', function () {
		// Get current element's coordinates
		var currentCoordinates = {
			top: parseFloat($element.css('top')),
			left: parseFloat($element.css('left'))
		};

		if (iconClass === null) { // If it's not an icon
			// Save coordinates to local storage
			localStorage.setItem(item, JSON.stringify(currentCoordinates));
		} else { // Else if this is icon
			// Get existing data from local storage
			var existingData = JSON.parse(localStorage.getItem(item)) || {};

			// Update or add coordinates for the current icon
			existingData[iconClass] = {
				icon: iconClass,
				coords: currentCoordinates
			};

			// Save updated data to local storage
			localStorage.setItem(item, JSON.stringify(existingData));
		}
	});

	// To prevent input propagation when entering values in popup over a window that has canvas
	$(elementSelector).on('focus', function (event) {
		event.stopPropagation();
	});

	$(elementSelector).on('keydown', function (event) {
		event.stopPropagation();
	});
}