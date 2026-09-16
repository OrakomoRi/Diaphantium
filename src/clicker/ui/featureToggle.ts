import { inject, type InjectionKey } from 'vue';
import type { SwitchableFeature } from '../core/state';

export type FeatureToggle = (feature: SwitchableFeature) => void;

export const FEATURE_TOGGLE: InjectionKey<FeatureToggle> = Symbol('feature-toggle');

export function useFeatureToggle(): FeatureToggle {
	const toggle = inject(FEATURE_TOGGLE);
	if (!toggle) throw new Error('The feature toggle is not provided');
	return toggle;
}
