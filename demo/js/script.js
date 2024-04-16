(function() {
	// Function to update hotkey text
	function updateHotkeyText() {
		var hotkeys = JSON.parse(localStorage.getItem('Diaphantium.hotkeys'));
		if (hotkeys && Array.isArray(hotkeys)) {
			var item = hotkeys.find(item => item.action === 'Open menu');
			
			item ? $('.actual_hotkey').text(item.value) : $('.actual_hotkey').text('Slash');
		} else {
			$('.actual_hotkey').text('Slash');
		}

		requestAnimationFrame(updateHotkeyText);
	}

	// Error handling
	window.addEventListener('error', function (event) {
		console.error('An error occurred:', event.error);
	});

	function appendToConsole(text, type) {
		var color;
		switch (type) {
			case 'log':
				color = 'default';
				break;
			case 'warn':
				color = 'yellow';
				break;
			case 'error':
				color = 'red';
				break;
			default:
				color = 'default';
		}

		// Get the current line number
		var lineNumber = $('.console div.line').length + 1;

		// Line number
		var $number = $('<span class="line-number"></span>').css('color', 'rgb(150,150,150)').text(lineNumber + ': ');

		// Value of the line
		var $value = $('<span></span>').css('color', color).text(text);

		// Create new line
		var $line = $('<div class="line"></div>').append($number).append($value);
		
		var $content = $('.console .content');
		$content.append($line);

		var $console = $('.console');

		$console.scrollTop($console[0].scrollHeight);
	}

	updateHotkeyText();

	$(document).ready(() => {
		// Original methods
		const originalConsoleMethods = {
			log: console.log,
			warn: console.warn,
			error: console.error
		};

		// Override console methods
		for (const method of ['log', 'warn', 'error']) {
			console[method] = (...args) => {
				originalConsoleMethods[method].apply(console, args);
				appendToConsole(args.join(' '), method);
			};
		}

		// Handler for the keydown event
		$(document).on('keydown', function(event) {
			// Logging the key code of the key event
			console.log('Key pressed: ' + event.code);
		});

		// Handler for unhandled errors
		window.onerror = function(message, source, lineno, colno, error) {
			// Logging the error
			console.error('Error:', message, 'at', source, 'line', lineno, 'column', colno, error);

			// Returning true to prevent the execution of the default error handler
			return true;
		};
	});
})();