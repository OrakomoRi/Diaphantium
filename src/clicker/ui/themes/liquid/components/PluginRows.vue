<script setup lang="ts">
import { settingsRows } from '../../../../plugins/registry';
import SettingRow from './SettingRow.vue';
import LiquidToggle from './LiquidToggle.vue';
</script>

<template>
	<SettingRow v-for="row in settingsRows" :key="`${row.pluginId}:${row.id}`" :title="row.label" :description="row.hint">
		<LiquidToggle :option="`${row.pluginId}-${row.id}`" :label="row.label" :checked="row.getChecked()" @change="row.onChange" />
	</SettingRow>
</template>
