<script setup lang="ts">
import { reactive } from 'vue';
import { settingsRows, type SettingsRow } from '../../../../plugins/registry';
import SettingRow from './SettingRow.vue';
import LiquidToggle from './LiquidToggle.vue';

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
	<SettingRow v-for="row in settingsRows" :key="rowKey(row)" :title="row.label" :description="row.hint">
		<LiquidToggle :option="`${row.pluginId}-${row.id}`" :label="row.label" :checked="isChecked(row)" @change="(checked: boolean) => onToggle(row, checked)" />
	</SettingRow>
</template>
