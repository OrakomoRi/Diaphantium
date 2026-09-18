<script setup lang="ts">
import { usePluginPicker } from '../../../model/pluginsTab';
import PluginPane from '../components/PluginPane.vue';
import PluginSelect from '../../../components/PluginSelect.vue';
import SettingRow from '../components/SettingRow.vue';

const picker = usePluginPicker();
</script>

<template>
	<div class="stack">
		<SettingRow :title="$t('plugins.picker')" :description="$t('plugins.pickerHint')" :tooltip="$t('tooltips.pluginSelect')">
			<template #below>
				<PluginSelect :options="picker.options.value" :model-value="picker.selected.value" @update:model-value="picker.select" />
			</template>
		</SettingRow>
		<PluginPane v-if="picker.current.value" :plugin-id="picker.current.value.id" />
	</div>
</template>
