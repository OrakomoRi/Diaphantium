<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'petite-vue-i18n';
import { MAX_MINE_DELAY, MIN_MINE_DELAY } from '../../../../config/config';
import { featureStates } from '../../../../core/state';
import { useFeatureToggle } from '../../../featureToggle';
import { useDialogKey, usePanelState } from '../../../model/panel';
import { useSupplies } from '../../../model/supplies';
import { SUPPLY_ICONS, supplyKeyFromCode } from '../../../model/supplyIcons';
import SettingRow from '../components/SettingRow.vue';
import LiquidToggle from '../components/LiquidToggle.vue';
import SupplyTile from '../components/SupplyTile.vue';
import DelayField from '../components/DelayField.vue';

const { t } = useI18n();
const supplies = useSupplies();
const toggleFeature = useFeatureToggle();
const { activeTab } = usePanelState();
const delayInvalid = ref(false);

useDialogKey(event => {
	if (activeTab.value !== 'clicker') return false;
	const key = supplyKeyFromCode(event.code);
	if (!key) return false;
	if (!event.repeat) supplies.toggle(key);
	return true;
});
</script>

<template>
	<div class="stack">
		<SettingRow :title="$t('clicker.clickSupplies')" :description="$t('clicker.clickSuppliesHint')" :tooltip="$t('tooltips.clickSupplies')">
			<LiquidToggle option="supplies" :label="$t('clicker.clickSupplies')" :checked="featureStates.supplies" @change="toggleFeature('supplies')" />
		</SettingRow>
		<div class="tiles" v-tooltip="$t('tooltips.supplies')">
			<SupplyTile
				v-for="icon in SUPPLY_ICONS"
				:key="icon.key"
				:icon="icon"
				:name="t(`clicker.supplyNames.${icon.name}`)"
				:short="t(`clicker.supplyShort.${icon.name}`)"
				:active="supplies.states[icon.key] === 'on'"
				@toggle="supplies.toggle(icon.key)"
			/>
		</div>
		<SettingRow :title="$t('clicker.clickMines')" :description="$t('clicker.clickMinesHint')" :tooltip="$t('tooltips.clickMines')">
			<LiquidToggle option="mines" :label="$t('clicker.clickMines')" :checked="featureStates.mines" @change="toggleFeature('mines')" />
		</SettingRow>
		<SettingRow
			:title="$t('clicker.mineDelayShort')"
			:description="$t('clicker.mineDelayHint')"
			:error="delayInvalid ? $t('clicker.mineDelayError', { min: MIN_MINE_DELAY, max: MAX_MINE_DELAY }) : null"
		>
			<DelayField
				:label="$t('clicker.mineDelay')"
				v-tooltip="$t('tooltips.mineDelay', { min: MIN_MINE_DELAY, max: MAX_MINE_DELAY })"
				@error="invalid => (delayInvalid = invalid)"
			/>
		</SettingRow>
	</div>
</template>
