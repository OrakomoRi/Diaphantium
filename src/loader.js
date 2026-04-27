import { Bridge } from './core/Bridge.js';
import { UpdateChecker } from './core/UpdateChecker.js';
import { CONFIG } from './config/config.js';
import Logger from './libs/loader/Logger.js';
import './libs/loader/nuntaria.min.js';

(async () => {
	Bridge.init();

	const logger = new Logger(CONFIG.SCRIPT_NAME);

	document.addEventListener('diaphantium:log', () => {
		logger.enableLogging();
	});

	const version = CONFIG.SCRIPT_VERSION;
	if (!version) {
		logger.log('Version not found on window.__DIAPHANTIUM__', 'error');
		return;
	}

	try {
		const cachedVersion = await Bridge.getValue('DiaphantiumVersion', '');
		const isSameVersion = cachedVersion === version;

		let clickerJS;

		if (isSameVersion) {
			logger.log('Loading clicker from cache.', 'info');
			clickerJS = await Bridge.getValue('DiaphantiumMainJS', null);
		} else {
			const url = `${CONFIG.getClickerCDN(version)}?t=${Date.now()}`;
			logger.log(`Fetching clicker from CDN: ${url}`, 'info');
			clickerJS = await Bridge.fetch(url);
			Bridge.setValue('DiaphantiumMainJS', clickerJS);
			Bridge.setValue('DiaphantiumVersion', version);
			logger.log('Clicker cached.', 'success');
		}

		if (clickerJS) {
			const script = document.createElement('script');
			script.setAttribute('data-resource', 'DiaphantiumJS');
			script.textContent = clickerJS;
			(document.body || document.documentElement).appendChild(script);
			logger.log('Clicker injected successfully.', 'success');
		}
	} catch (error) {
		logger.log(`Error loading clicker: ${error}`, 'error');
	}

	if (CONFIG.UPDATE_CHECK_ENABLED) {
		const updateChecker = new UpdateChecker(logger);
		updateChecker.check().catch((err) =>
			logger.log(`Update check failed: ${err}`, 'warn')
		);
	}
})();
