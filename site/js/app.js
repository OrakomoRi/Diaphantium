import { SmoothScroll } from './components/SmoothScroll.js';
import { HeaderController } from './components/HeaderController.js';
import { VersionTimeline } from './components/VersionTimeline.js';
import { Animations } from './components/Animations.js';
import { LanguageSwitcher } from './components/LanguageSwitcher.js';
import { I18nService } from './services/I18nService.js';
import { VersionService } from './services/VersionService.js';
import { ScriptLoader } from './services/ScriptLoader.js';
import { loadHotkey } from './utils/storage.js';

async function init() {
	await waitForDOM();

	const i18nService = new I18nService();
	const [languages, i18nManager] = await Promise.all([
		i18nService.loadLanguages(),
		i18nService.initI18n().catch(err => {
			console.warn('I18n initialization failed:', err);
			return null;
		})
	]);

	loadHotkey();

	let timeline = null;

	if (i18nManager) {
		new LanguageSwitcher(i18nManager, languages, () => {
			loadHotkey();
			timeline?.updateLanguage();
		}).setup();
	}

	const versionService = new VersionService();

	await Promise.all([
		versionService.updateHeroBadge(),
		versionService.setupDownloadButtons(),
		new ScriptLoader().load()
	]);

	versionService.setupDevButton();

	new SmoothScroll();
	new HeaderController();
	const animations = new Animations();
	animations.init();

	if (i18nManager) {
		timeline = new VersionTimeline(i18nManager.i18n);
		await timeline.init();
		animations.animateTimeline();
	}
}

function waitForDOM() {
	return new Promise(resolve => {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', resolve);
		} else {
			resolve();
		}
	});
}

init();
