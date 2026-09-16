import classic from './classic';
import liquid from './liquid';
import { storedThemeId, type ThemeId } from '../model/theme';
import type { Theme } from './types';

export const THEMES: Record<ThemeId, Theme> = { classic, liquid };

export function themeById(id: ThemeId): Theme {
	return THEMES[id];
}

export function activeTheme(): Theme {
	return themeById(storedThemeId());
}
