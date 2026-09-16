import { getStorage, setStorage } from '../../storage/storage';

export const THEME_IDS = ['classic', 'liquid'] as const;
export type ThemeId = typeof THEME_IDS[number];

export const DEFAULT_THEME: ThemeId = 'classic';

export function isThemeId(value: unknown): value is ThemeId {
	return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export function storedThemeId(): ThemeId {
	const saved = getStorage('theme');
	return isThemeId(saved) ? saved : DEFAULT_THEME;
}

export function saveThemeId(id: ThemeId): void {
	setStorage('theme', id);
}
