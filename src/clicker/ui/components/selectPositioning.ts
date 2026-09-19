import type { SelectRootProps } from '@ark-ui/vue';

export const SELECT_POSITIONING: NonNullable<SelectRootProps<object>['positioning']> = {
	placement: 'bottom-end',
	gutter: 6,
	flip: true,
	sameWidth: true,
	fitViewport: true,
	overlap: true,
};
