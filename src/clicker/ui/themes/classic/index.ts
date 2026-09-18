import resetCSS from '../../../assets/css/diaphantium.reset.css?inline';
import classicCSS from './classic.css?inline';
import ClassicPanel from './ClassicPanel.vue';
import TooltipLayer from './components/TooltipLayer.vue';
import { SPRINGS } from './springs';
import type { Theme } from '../types';

const classic: Theme = {
	id: 'classic',
	panel: ClassicPanel,
	tooltip: TooltipLayer,
	styles: resetCSS + classicCSS,
	presence: {
		open: { visualDuration: 0.3, bounce: 0 },
		close: { visualDuration: 0.2, bounce: 0 },
	},
	layout: {
		size: '.card',
		position: '.option > :not(.field), .hotkey > *, .repository > *, .divider, .supply-picker__list, .about__facts dd, .popup__tab',
		text: '.tab-panel__title, .section__title, .option__text, .hotkey__label > .option__label, .about__hero, .about__facts dt, .choice__item, .select__current',
		spring: SPRINGS.height,
	},
	highlight: SPRINGS.glide,
};

export default classic;
