export const NAME = 'Diaphantium';
export const AUTHOR = 'OrakomoRi';

export const POPUP_OPEN_CLASS = `${NAME.toLowerCase()}-popup-open`;

export const REPOSITORY_URL = 'https://github.com/OrakomoRi/Diaphantium';
export const LICENSE = 'MIT';

export const HOTKEY_ACTIONS = {
	openMenu: 'Open menu',
	clickSupplies: 'Click supplies',
	clickMines: 'Click mines',
} as const;

export const DEFAULT_OPEN_HOTKEY = 'Slash';
export const DEFAULT_MINE_DELAY = 100;
export const MIN_MINE_DELAY = 0;
export const MAX_MINE_DELAY = 60000;
