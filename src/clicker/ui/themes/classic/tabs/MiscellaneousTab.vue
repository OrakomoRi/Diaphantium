<script setup lang="ts">
import { ArrowLeftRight, Skull } from '@lucide/vue';
import { featureStates } from '../../../../core/state';
import { useFeatureToggle } from '../../../featureToggle';
import TabPane from '../components/TabPane.vue';
import OptionRow from '../components/OptionRow.vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';

const toggleFeature = useFeatureToggle();
</script>

<template>
	<TabPane name="miscellaneous">
		<h2 class="tab-panel__title">{{ $t('miscellaneous.header') }}</h2>

		<div class="tab-panel__scroll">
			<div class="card">
				<OptionRow :icon="ArrowLeftRight" :label="$t('miscellaneous.antiAfk')" :hint="$t('miscellaneous.antiAfkHint')" :tooltip="$t('tooltips.antiAfk')">
					<ToggleSwitch option="anti-afk" :checked="featureStates.antiAfk" @change="toggleFeature('antiAfk')" />
				</OptionRow>
			</div>

			<div class="card" data-tone="danger">
				<OptionRow
					:icon="Skull"
					tone="danger"
					:label="$t('miscellaneous.autoDelete')"
					:hint="$t('miscellaneous.autoDeleteHint')"
					:tooltip="{ content: $t('tooltips.autoDelete'), tone: 'danger' }"
				>
					<ToggleSwitch option="auto-delete" tone="danger" :checked="featureStates.autoDelete" @change="toggleFeature('autoDelete')" />
				</OptionRow>
			</div>
		</div>
	</TabPane>
</template>
