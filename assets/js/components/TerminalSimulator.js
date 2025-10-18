export class TerminalSimulator {
	constructor(terminalElement, i18n) {
		this.terminal = terminalElement;
		this.i18n = i18n;
		this.output = this.terminal.querySelector('.terminal-body');
		this.lines = [];
		this.getHotkey();
		this.autoStart();
		this.setupKeyListener();
	}

	isMobile() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
	}

	getHotkey() {
		try {
			const hotkeyData = localStorage.getItem('Diaphantium.hotkeys');
			if (hotkeyData) {
				const hotkeys = JSON.parse(hotkeyData);
				// Assuming the main hotkey is the first one or has a specific key
				this.hotkey = hotkeys[0]?.value || 'Slash';
			} else {
				this.hotkey = 'Slash';
			}
		} catch (e) {
			this.hotkey = 'Slash';
		}
	}

	async autoStart() {
		await this.delay(1000);
		this.simulateInstallation();
	}

	async simulateInstallation() {
		if (this.isMobile()) {
			const mobileMessage = this.i18n.t('console.mobileNotSupported');
			this.addLine(mobileMessage, 'error');
		} else {
			const hotkeyDisplay = this.hotkey === 'Slash' ? '/' : this.hotkey;
			const readyMessage = this.i18n.t('console.terminal.readyMessage', { hotkey: hotkeyDisplay });
			this.addLine(readyMessage, 'output');
		}
	}

	setupKeyListener() {
		if (!this.isMobile()) {
			document.addEventListener('keydown', (e) => {
				const keyCode = e.code;
				const timestamp = new Date().toLocaleTimeString();
				const keyMessage = this.i18n.t('console.terminal.keyPressed', { timestamp, key: keyCode });
				this.addLine(keyMessage, 'command');
			});
		}
	}

	addLine(text, type = 'output') {
		const line = document.createElement('div');
		line.className = `terminal-line terminal-${type}`;
		line.textContent = text;

		this.output.appendChild(line);
		this.output.scrollTop = this.output.scrollHeight;
	}

	delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	updateLanguage() {
		// Clear terminal and re-display ready message
		this.output.innerHTML = '';
		if (this.isMobile()) {
			const mobileMessage = this.i18n.t('console.mobileNotSupported');
			this.addLine(mobileMessage, 'error');
		} else {
			const hotkeyDisplay = this.hotkey === 'Slash' ? '/' : this.hotkey;
			const readyMessage = this.i18n.t('console.terminal.readyMessage', { hotkey: hotkeyDisplay });
			this.addLine(readyMessage, 'output');
		}
	}
}
