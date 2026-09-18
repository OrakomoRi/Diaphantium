import DOMPurify from 'dompurify';
import { h, type Component } from 'vue';
import {
	ArrowLeftRight,
	Bell,
	Blocks,
	Check,
	ChevronDown,
	ExternalLink,
	Info,
	Languages,
	MousePointerClick,
	Palette,
	PenLine,
	Puzzle,
	RotateCcw,
	Settings,
	Shield,
	Skull,
	Sparkles,
	Star,
	Timer,
	Wrench,
	X,
	Zap,
} from '@lucide/vue';
import { logger } from '../core/logger';

const LUCIDE_ICONS = {
	ArrowLeftRight,
	Bell,
	Blocks,
	Check,
	ChevronDown,
	ExternalLink,
	Info,
	Languages,
	MousePointerClick,
	Palette,
	PenLine,
	Puzzle,
	RotateCcw,
	Settings,
	Shield,
	Skull,
	Sparkles,
	Star,
	Timer,
	Wrench,
	X,
	Zap,
} as const satisfies Record<string, Component>;

export type PluginLucideIconName = keyof typeof LUCIDE_ICONS;

export interface PluginIconLucide {
	type: 'lucide';
	name: PluginLucideIconName;
}

export interface PluginIconSvg {
	type: 'svg';
	markup: string;
}

export type PluginIcon = PluginIconLucide | PluginIconSvg;

const MAX_SVG_MARKUP_LENGTH = 4096;

function sanitizeSvgMarkup(markup: string, pluginId: string): string | null {
	if (typeof markup !== 'string' || markup.length === 0 || markup.length > MAX_SVG_MARKUP_LENGTH) {
		logger.log(`Plugin "${pluginId}" refused an icon - svg markup missing or over ${MAX_SVG_MARKUP_LENGTH} bytes`, 'warn');
		return null;
	}
	const sanitized = DOMPurify.sanitize(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, { USE_PROFILES: { svg: true, svgFilters: true } }).trim();
	if (!sanitized) {
		logger.log(`Plugin "${pluginId}" refused an icon - svg markup was empty after sanitization`, 'warn');
		return null;
	}
	return sanitized;
}

function customSvgComponent(sanitizedMarkup: string): Component {
	return {
		name: 'PluginCustomIcon',
		render: () =>
			h('svg', {
				viewBox: '0 0 24 24',
				width: 24,
				height: 24,
				fill: 'none',
				stroke: 'currentColor',
				'stroke-width': 2,
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round',
				'aria-hidden': 'true',
				innerHTML: sanitizedMarkup,
			}),
	};
}

export function resolvePluginIcon(icon: PluginIcon | undefined, pluginId: string): Component | null {
	if (!icon || typeof icon !== 'object') return null;
	if (icon.type === 'lucide') {
		const component = LUCIDE_ICONS[icon.name];
		if (!component) {
			logger.log(`Plugin "${pluginId}" refused an icon - "${icon.name}" is not in the built-in lucide set`, 'warn');
			return null;
		}
		return component;
	}
	if (icon.type === 'svg') {
		const sanitized = sanitizeSvgMarkup(icon.markup, pluginId);
		return sanitized ? customSvgComponent(sanitized) : null;
	}
	logger.log(`Plugin "${pluginId}" refused an icon - unknown type "${(icon as { type?: unknown }).type}"`, 'warn');
	return null;
}
