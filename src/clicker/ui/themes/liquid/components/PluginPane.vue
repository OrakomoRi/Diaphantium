<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Puzzle } from '@lucide/vue';
import { plugins, type SettingsRow } from '../../../../plugins/registry';
import SettingRow from './SettingRow.vue';
import LiquidToggle from './LiquidToggle.vue';

const props = defineProps<{ pluginId: string }>();

const entry = computed(() => plugins.find(p => p.id === props.pluginId) ?? null);

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
	<template v-if="entry">
		<SettingRow v-for="row in entry.looseRows" :key="rowKey(row)" :title="row.label" :description="row.hint">
			<LiquidToggle :option="`${row.pluginId}-${row.id}`" :label="row.label" :checked="isChecked(row)" @change="(checked: boolean) => onToggle(row, checked)" />
		</SettingRow>

		<div v-for="section in entry.sections" :key="`${section.pluginId}:${section.id}`" class="stack__section">
			<div class="stack__section-title">
				<span class="stack__section-icon" aria-hidden="true"><component :is="section.icon ?? Puzzle" /></span>
				{{ section.title }}
			</div>
			<SettingRow v-for="row in section.rows" :key="rowKey(row)" :title="row.label" :description="row.hint">
				<LiquidToggle :option="`${row.pluginId}-${row.id}`" :label="row.label" :checked="isChecked(row)" @change="(checked: boolean) => onToggle(row, checked)" />
			</SettingRow>
		</div>
	</template>
</template>
