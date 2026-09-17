<script setup lang="ts">
import { Puzzle } from '@lucide/vue';
import { settingsRows } from '../../../../plugins/registry';
import OptionRow from './OptionRow.vue';
import ToggleSwitch from './ToggleSwitch.vue';
</script>

<template>
	<div v-if="settingsRows.length" class="card">
		<div class="section">
			<h3 class="section__title">{{ $t('settings.plugins') }}</h3>

			<template v-for="(row, index) in settingsRows" :key="`${row.pluginId}:${row.id}`">
				<div v-if="index > 0" class="divider"></div>
				<OptionRow :icon="Puzzle" :label="row.label" :hint="row.hint">
					<ToggleSwitch :option="`${row.pluginId}-${row.id}`" :checked="row.getChecked()" @change="row.onChange" />
				</OptionRow>
			</template>
		</div>
	</div>
</template>
