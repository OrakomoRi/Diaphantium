export const NAME = 'Diaphantium';
export const AUTHOR = 'OrakomoRi';

export const POPUP_SELECTOR = `.popup_container.${NAME.toLowerCase()}[author="${AUTHOR}"]`;
export const POPUP_INNER_SELECTOR = `${POPUP_SELECTOR} .popup`;
export const POPUP_OPEN_CLASS = `${NAME.toLowerCase()}-popup-open`;

export const STORAGE_KEYS = {
	coordinates: `${NAME}.coordinates`,
	clickValues: `${NAME}.clickValues`,
	clickSuppliesState: `${NAME}.clickSuppliesState`,
	antiAfkState: `${NAME}.antiAfkState`,
	autoDeleteState: `${NAME}.autoDeleteState`,
	hotkeys: `${NAME}.hotkeys`,
	showSignature: `${NAME}.showSignature`,
	mineDelay: `${NAME}.mineDelay`
};

export const CHECKBOX_CLASSES = {
	supplies: 'supplies',
	antiAfk: 'anti_afk',
	autoDelete: 'auto_delete'
};

export const HOTKEY_ACTIONS = {
	openMenu: 'Open menu',
	clickSupplies: 'Click supplies',
	clickMines: 'Click mines'
};

export const DEFAULT_OPEN_HOTKEY = 'Slash';
export const DEFAULT_MINE_DELAY = 100;
