<script setup lang="ts">
import { reactive } from 'vue';
import { Puzzle } from '@lucide/vue';
import { settingsRows, type SettingsRow } from '../../../../plugins/registry';
import OptionRow from './OptionRow.vue';
import ToggleSwitch from './ToggleSwitch.vue';

const checkedCache = reactive<Record<string, boolean>>({});

function rowKey(row: SettingsRow): string {
	return `${row.pluginId}:${row.id}`;
}

function isChecked(row: SettingsRow): boolean {
	const key = rowKey(row);
	if (!(key in checkedCache)) checkedCache[key] = row.getChecked();
	return checkedCache[key]!;
}

function onToggle(row: SettingsRow, checked: boolean): void {
	checkedCache[rowKey(row)] = checked;
	row.onChange(checked);
}
</script>

<template>
	<div v-if="settingsRows.length" class="card">
		<div class="section">
			<h3 class="section__title">{{ $t('settings.plugins') }}</h3>

			<template v-for="(row, index) in settingsRows" :key="rowKey(row)">
				<div v-if="index > 0" class="divider"></div>
				<OptionRow :icon="Puzzle" :label="row.label" :hint="row.hint">
					<ToggleSwitch :option="`${row.pluginId}-${row.id}`" :checked="isChecked(row)" @change="(checked: boolean) => onToggle(row, checked)" />
				</OptionRow>
			</template>
		</div>
	</div>
</template>
