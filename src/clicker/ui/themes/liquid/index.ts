import liquidCSS from './liquid.css?inline';
import LiquidPanel from './LiquidPanel.vue';
import LiquidTooltip from './components/LiquidTooltip.vue';
import { SPRINGS } from './springs';
import type { Theme } from '../types';

const liquid: Theme = {
	id: 'liquid',
	panel: LiquidPanel,
	tooltip: LiquidTooltip,
	styles: liquidCSS,
	presence: {
		open: SPRINGS.unfold,
		close: SPRINGS.fold,
	},
	layout: {
		size: '.setting',
		position: '.setting > :not(.repository__plate), .setting__main > *, .tiles, .about__facts dd, .segment',
		text: '.setting__text, .about__hero, .about__facts dt, .tile__label, .well__text, .well__suffix, .select__current, .segment__content > span',
		spring: SPRINGS.soft,
	},
	highlight: SPRINGS.glide,
};

export default liquid;
