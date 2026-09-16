<script setup lang="ts">
import { featureStates } from '../../../../core/state';
import { useFeatureToggle } from '../../../featureToggle';
import SettingRow from '../components/SettingRow.vue';
import LiquidToggle from '../components/LiquidToggle.vue';

const toggleFeature = useFeatureToggle();
</script>

<template>
	<div class="stack">
		<SettingRow :title="$t('miscellaneous.antiAfk')" :description="$t('miscellaneous.antiAfkHint')" :tooltip="$t('tooltips.antiAfk')">
			<LiquidToggle option="anti-afk" :label="$t('miscellaneous.antiAfk')" :checked="featureStates.antiAfk" @change="toggleFeature('antiAfk')" />
		</SettingRow>
		<SettingRow
			tone="danger"
			:title="$t('miscellaneous.autoDelete')"
			:description="$t('miscellaneous.autoDeleteHint')"
			:tooltip="{ content: $t('tooltips.autoDelete'), tone: 'danger' }"
		>
			<LiquidToggle option="auto-delete" tone="danger" :label="$t('miscellaneous.autoDelete')" :checked="featureStates.autoDelete" @change="toggleFeature('autoDelete')" />
		</SettingRow>
	</div>
</template>
