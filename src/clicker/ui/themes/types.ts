import type { Component } from 'vue';
import type { SpringPreset } from '../motion/springs';
import type { LayoutMorphOptions } from '../motion/layoutMorph';
import type { ThemeId } from '../model/theme';

export interface ThemePresence {
	open: SpringPreset;
	close: SpringPreset;
}

export type ThemePart = 'panel' | 'tooltip';

export interface Theme {
	id: ThemeId;
	panel: Component;
	tooltip: Component;
	styles: string;
	presence: ThemePresence;
	layout: LayoutMorphOptions;
	highlight: SpringPreset;
}
