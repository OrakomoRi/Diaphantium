<script setup lang="ts">
import { Blocks } from '@lucide/vue';
import { usePluginPicker } from '../../../model/pluginsTab';
import TabPane from '../components/TabPane.vue';
import PluginPane from '../components/PluginPane.vue';
import PluginSelect from '../../../components/PluginSelect.vue';

const picker = usePluginPicker();
</script>

<template>
	<TabPane name="plugins">
		<h2 class="tab-panel__title">{{ $t('plugins.header') }}</h2>

		<div class="tab-panel__scroll">
			<div class="card">
				<div class="option option--stacked" v-tooltip="$t('tooltips.pluginSelect')">
					<span class="option__icon" aria-hidden="true"><Blocks /></span>
					<span class="option__text">
						<span class="option__label">{{ $t('plugins.picker') }}</span>
						<span class="option__hint">{{ $t('plugins.pickerHint') }}</span>
					</span>
					<PluginSelect :options="picker.options.value" :model-value="picker.selected.value" @update:model-value="picker.select" />
				</div>
			</div>

			<PluginPane v-if="picker.current.value" :plugin-id="picker.current.value.id" />
		</div>
	</TabPane>
</template>
