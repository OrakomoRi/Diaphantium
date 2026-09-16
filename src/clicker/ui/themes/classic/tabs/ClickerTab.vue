<script setup lang="ts">
import { MousePointerClick, Timer } from '@lucide/vue';
import { useI18n } from 'petite-vue-i18n';
import { MAX_MINE_DELAY, MIN_MINE_DELAY } from '../../../../config/config';
import { featureStates } from '../../../../core/state';
import { useFeatureToggle } from '../../../featureToggle';
import { useDialogKey, usePanelState } from '../../../model/panel';
import { useSupplies } from '../../../model/supplies';
import { SUPPLY_ICONS, supplyKeyFromCode } from '../../../model/supplyIcons';
import TabPane from '../components/TabPane.vue';
import OptionRow from '../components/OptionRow.vue';
import SupplyButton from '../components/SupplyButton.vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import DelayField from '../components/DelayField.vue';

const { t } = useI18n();
const supplies = useSupplies();
const toggleFeature = useFeatureToggle();
const { activeTab } = usePanelState();

useDialogKey(event => {
	if (activeTab.value !== 'clicker') return false;
	const key = supplyKeyFromCode(event.code);
	if (!key) return false;
	if (!event.repeat) supplies.toggle(key);
	return true;
});
</script>

<template>
	<TabPane name="clicker">
		<h2 class="tab-panel__title">{{ $t('clicker.header') }}</h2>

		<div class="tab-panel__scroll">
			<div class="card">
				<div class="section supply-picker">
					<h3 class="section__title" v-tooltip="$t('tooltips.supplies')">{{ $t('clicker.supplies') }}</h3>
					<div class="supply-picker__list">
						<SupplyButton
							v-for="icon in SUPPLY_ICONS"
							:key="icon.key"
							:icon="icon"
							:name="t(`clicker.supplyNames.${icon.name}`)"
							:active="supplies.states[icon.key] === 'on'"
							@toggle="supplies.toggle(icon.key)"
						/>
					</div>
				</div>

				<div class="divider"></div>

				<OptionRow :icon="MousePointerClick" :label="$t('clicker.clickSupplies')" :hint="$t('clicker.clickSuppliesHint')" :tooltip="$t('tooltips.clickSupplies')">
					<ToggleSwitch option="supplies" :checked="featureStates.supplies" @change="toggleFeature('supplies')" />
				</OptionRow>
			</div>

			<div class="card">
				<OptionRow :icon="Timer" field :label="$t('clicker.mineDelay')" :hint="$t('clicker.mineDelayHint')">
					<DelayField v-tooltip="$t('tooltips.mineDelay', { min: MIN_MINE_DELAY, max: MAX_MINE_DELAY })" />
				</OptionRow>
			</div>
		</div>
	</TabPane>
</template>
