<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'petite-vue-i18n';
import { useHotkeySettings } from '../../../model/hotkeys';
import { usePanelShell, usePanelState } from '../../../model/panel';
import { THEME_IDS } from '../../../model/theme';
import SettingRow from '../components/SettingRow.vue';
import SegmentedControl from '../components/SegmentedControl.vue';
import HotkeyField from '../components/HotkeyField.vue';
import LiquidToggle from '../components/LiquidToggle.vue';
import PluginRows from '../components/PluginRows.vue';
import LanguageSelect from '../../../components/LanguageSelect.vue';

const { t } = useI18n();
const shell = usePanelShell();
const { hotkeys, assign, reset, isDuplicate, isDefault } = useHotkeySettings();
const { showSignature, setShowSignature } = usePanelState();

const themeOptions = computed(() => THEME_IDS.map(id => ({ id, label: t(`themes.${id}`), data: { 'data-theme-option': id } })));
</script>

<template>
	<div class="stack">
		<SettingRow :title="$t('settings.theme')" :description="$t('settings.themeHint')" :tooltip="$t('tooltips.theme')">
			<template #below>
				<SegmentedControl
					compact
					role="radiogroup"
					:options="themeOptions"
					:model-value="shell.theme.value"
					@update:model-value="shell.selectTheme"
				/>
			</template>
		</SettingRow>
		<SettingRow :title="$t('settings.language')" :description="$t('settings.languageHint')" :tooltip="$t('tooltips.language')">
			<LanguageSelect />
		</SettingRow>
		<SettingRow v-for="hotkey in hotkeys" :key="hotkey.action" :title="$t(hotkey.label)">
			<HotkeyField
				:hotkey="hotkey"
				:duplicate="isDuplicate(hotkey)"
				:changed="!isDefault(hotkey)"
				:assign="code => assign(hotkey, code)"
				:reset="() => reset(hotkey)"
			/>
		</SettingRow>
		<SettingRow :title="$t('settings.showSignature')" :tooltip="$t('tooltips.showSignature')">
			<LiquidToggle option="show-signature" :label="$t('settings.showSignature')" :checked="showSignature" @change="setShowSignature" />
		</SettingRow>
		<PluginRows />
	</div>
</template>
