import { createI18n, registerLocaleFallbacker, registerMessageResolver } from 'petite-vue-i18n';
import { fallbackWithLocaleChain, resolveValue } from '@intlify/core-base';
import messages from '@intlify/unplugin-vue-i18n/messages';
import { gameLanguage } from '@/shared/utils/detectLanguage';
import { getStorage } from '../storage/storage';
import { runtimeLocales } from '../plugins/registry';
import type en from './lang/en.json';

type ClickerMessages = typeof en;

declare module 'petite-vue-i18n' {
	export interface DefineLocaleMessage extends ClickerMessages {}
}

registerMessageResolver(resolveValue);
registerLocaleFallbacker(fallbackWithLocaleChain);

export const LANGUAGE_CHOICES = ['auto', 'en', 'ru', 'uk'] as const;
export type LanguageChoice = typeof LANGUAGE_CHOICES[number];

export const LANGUAGE_CODES: Readonly<Record<Exclude<LanguageChoice, 'auto'>, string>> = { en: 'EN', ru: 'RU', uk: 'UA' };

const available = (messages ?? {}) as Record<string, ClickerMessages>;

export function isLanguageChoice(value: unknown): value is LanguageChoice {
	return typeof value === 'string' && (LANGUAGE_CHOICES as readonly string[]).includes(value);
}

function isKnownChoice(value: unknown): value is string {
	return isLanguageChoice(value) || (typeof value === 'string' && runtimeLocales.has(value));
}

export function storedLanguageChoice(): string {
	const saved = getStorage('language');
	return isKnownChoice(saved) ? saved : 'auto';
}

export function clickerLocale(choice: string = storedLanguageChoice()): string {
	const language = choice === 'auto' ? gameLanguage() : choice;
	return Object.hasOwn(available, language) || runtimeLocales.has(language) ? language : 'en';
}

export function createClickerI18n() {
	return createI18n<[ClickerMessages], string, false>({
		legacy: false,
		locale: clickerLocale(),
		fallbackLocale: 'en',
		messages: available,
	});
}
