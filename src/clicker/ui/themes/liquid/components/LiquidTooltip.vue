<script setup lang="ts">
import { useTooltipLayer } from '../../../tooltip/useTooltipLayer';
import { SPRINGS } from '../springs';

const { root, shown, side } = useTooltipLayer({
	gap: 10,
	margin: 8,
	arrowInset: 14,
	shift: 6,
	fade: SPRINGS.fade,
	glide: SPRINGS.glide,
});
</script>

<template>
	<div ref="root" class="tooltip" role="tooltip" :data-side="side" :data-tone="shown?.tone">
		<template v-if="shown">
			<span class="tooltip__text">{{ shown.content }}</span>
			<span v-if="shown.kbd.length" class="tooltip__keys">
				<kbd v-for="key in shown.kbd" :key="key" class="tooltip__key">{{ key }}</kbd>
			</span>
		</template>
	</div>
</template>
