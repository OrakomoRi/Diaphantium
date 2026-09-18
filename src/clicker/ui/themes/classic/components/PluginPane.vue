<script setup lang="ts">
import { computed, reactive } from 'vue';
import { Puzzle } from '@lucide/vue';
import { plugins, type SettingsRow } from '../../../../plugins/registry';
import OptionRow from './OptionRow.vue';
import ToggleSwitch from './ToggleSwitch.vue';

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
		<div v-if="entry.looseRows.length" class="card">
			<div class="section">
				<template v-for="(row, index) in entry.looseRows" :key="rowKey(row)">
					<div v-if="index > 0" class="divider"></div>
					<OptionRow :icon="row.icon ?? Puzzle" :label="row.label" :hint="row.hint">
						<ToggleSwitch :option="`${row.pluginId}-${row.id}`" :checked="isChecked(row)" @change="(checked: boolean) => onToggle(row, checked)" />
					</OptionRow>
				</template>
			</div>
		</div>

		<div v-for="section in entry.sections" :key="`${section.pluginId}:${section.id}`" class="card">
			<div class="section">
				<h3 class="section__title">
					<span class="section__icon" aria-hidden="true"><component :is="section.icon ?? Puzzle" /></span>
					{{ section.title }}
				</h3>

				<div class="section__list">
					<template v-for="(row, index) in section.rows" :key="rowKey(row)">
						<div v-if="index > 0" class="divider"></div>
						<OptionRow :icon="row.icon ?? Puzzle" :label="row.label" :hint="row.hint">
							<ToggleSwitch :option="`${row.pluginId}-${row.id}`" :checked="isChecked(row)" @change="(checked: boolean) => onToggle(row, checked)" />
						</OptionRow>
					</template>
				</div>
			</div>
		</div>
	</template>
</template>
