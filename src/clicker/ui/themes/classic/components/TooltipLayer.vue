<script setup lang="ts">
import { useTooltipLayer } from '../../../tooltip/useTooltipLayer';
import { SPRINGS } from '../springs';

const { root, shown, side, arrow } = useTooltipLayer({
	gap: 8,
	margin: 8,
	arrowInset: 12,
	shift: 4,
	fade: SPRINGS.fade,
	glide: SPRINGS.glide,
});
</script>

<template>
	<div
		ref="root"
		class="tooltip"
		role="tooltip"
		:data-side="side"
		:data-tone="shown?.tone"
		:style="{ '--tooltip-arrow': `${arrow}px` }"
	>
		<template v-if="shown">
			<span class="tooltip__text">{{ shown.content }}</span>
			<span v-if="shown.kbd.length" class="tooltip__keys">
				<kbd v-for="key in shown.kbd" :key="key" class="tooltip__key">{{ key }}</kbd>
			</span>
		</template>
		<span class="tooltip__arrow" aria-hidden="true"></span>
	</div>
</template>
