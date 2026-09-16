import { Logger } from '@utensilia/logger';
import { CONFIG } from './config/config';
import { Bridge } from './core/Bridge';
import { UpdateChecker } from './core/UpdateChecker';

async function loadClicker(logger: Logger, version: string, source: string | null): Promise<string | null> {
	if (source) {
		const url = `${source}diaphantium.min.js?t=${Date.now()}`;
		logger.log(`Fetching clicker from development source: ${url}`, 'info');
		return Bridge.fetch(url);
	}

	const cachedVersion = await Bridge.getValue('DiaphantiumVersion', '');

	if (cachedVersion === version) {
		logger.log('Loading clicker from cache.', 'info');
		return Bridge.getValue<string | null>('DiaphantiumMainJS', null);
	}

	const url = `${CONFIG.getClickerCDN(version)}?t=${Date.now()}`;
	logger.log(`Fetching clicker from CDN: ${url}`, 'info');
	const clickerJS = await Bridge.fetch(url);
	Bridge.setValue('DiaphantiumMainJS', clickerJS);
	Bridge.setValue('DiaphantiumVersion', version);
	logger.log('Clicker cached.', 'success');
	return clickerJS;
}

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

	const source = CONFIG.DEVELOPMENT_SOURCE;
	if (source) logger.enableLogging();

	try {
		const clickerJS = await loadClicker(logger, version, source);

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

	if (CONFIG.UPDATE_CHECK_ENABLED && !source) {
		const updateChecker = new UpdateChecker(logger);
		updateChecker.check().catch(error =>
			logger.log(`Update check failed: ${error}`, 'warn'),
		);
	}
})();
