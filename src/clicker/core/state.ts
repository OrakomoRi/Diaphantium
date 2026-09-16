import { reactive } from 'vue';

export const featureStates = reactive({
	supplies: false,
	antiAfk: false,
	autoDelete: false,
});

export type SwitchableFeature = keyof typeof featureStates;

export function isSwitchableFeature(name: string): name is SwitchableFeature {
	return Object.hasOwn(featureStates, name);
}
