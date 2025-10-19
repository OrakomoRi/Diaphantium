class Logger {
	/**
	 * Creates an instance of Logger.
	 *
	 * @param {string} scriptName - The script name.
	 * @param {boolean} [logging=false] - Enables or disables logging.
	 */
	constructor(scriptName, logging = false) {
		this.scriptName = scriptName;
		this.logging = logging;
		this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	/**
	 * Logs messages to the console with different styles based on log type.
	 *
	 * @param {string} message - The message to log.
	 * @param {string} type - The type of log (log, info, warn, error, success, debug).
	 */
	log(message, type = 'log') {
		if (!this.logging) return;

		const darkStyles = {
			log: 'color: white',
			info: 'color: #5ea9ff',
			warn: 'color: #ffa500',
			error: 'color: #ff4c4c',
			success: 'color: #4cff4c',
			debug: 'color: #c77dff'
		};

		const lightStyles = {
			log: 'color: black',
			info: 'color: #004085',
			warn: 'color: #856404',
			error: 'color: #721c24',
			success: 'color: #155724',
			debug: 'color: #6a0572'
		};

		const styles = this.isDarkMode ? darkStyles : lightStyles;

		console.log(`%c${this.scriptName} log:\n%c${message}`, 'color: white; font-weight: bold', styles[type] || styles.log);
	}

	/**
	 * Logs the result of the version comparison.
	 *
	 * @param {number} compareResult - The result of the version comparison.
	 * @param {string} githubVersion - The current version of the script.
	 * @param {string} githubVersion - The latest version from GitHub.
	 */
	logVersionComparison(compareResult, currentVersion, githubVersion) {
		let state = false;
		if (!this.logging) {
			this.logging = true;
			state = true;
		}
		
		switch (compareResult) {
			case 1:
				this.log(`A new version is available on GitHub: ${githubVersion}. Checking for stable version...`, 'info');
				break;
			case 0:
				this.log(/[-+]/.test(currentVersion)
					? `You are using some version that is based on the latest stable.`
					: `You are using the latest stable version.`, 'info');
				break;
			case -1:
				this.log(`You are using a version newer than the one on GitHub.`, 'warn');
				break;
			case -2:
				this.log(`Error comparing versions.`, 'error');
				break;
			default:
				this.log(`Default case`);
		}

		if (state) {
			this.logging = false;
		}

		this.log(`Your × GitHub:\n${currentVersion} × ${githubVersion}`, 'info');
	}

	/**
	 * Enables logging.
	 */
	enableLogging() {
		this.logging = true;
	}

	/**
	 * Disables logging.
	 */
	disableLogging() {
		this.logging = false;
	}
}