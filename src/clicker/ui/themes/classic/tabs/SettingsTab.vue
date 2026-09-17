<script setup lang="ts">
import { Languages, Palette, PenLine } from '@lucide/vue';
import { useHotkeySettings } from '../../../model/hotkeys';
import { usePanelShell, usePanelState } from '../../../model/panel';
import { THEME_IDS } from '../../../model/theme';
import TabPane from '../components/TabPane.vue';
import OptionRow from '../components/OptionRow.vue';
import ToggleSwitch from '../components/ToggleSwitch.vue';
import HotkeyRow from '../components/HotkeyRow.vue';
import PluginRows from '../components/PluginRows.vue';
import LanguageSelect from '../../../components/LanguageSelect.vue';

const { hotkeys, assign, reset, isDuplicate } = useHotkeySettings();
const { showSignature, setShowSignature } = usePanelState();
const shell = usePanelShell();
</script>

<template>
	<TabPane name="settings">
		<h2 class="tab-panel__title">{{ $t('settings.header') }}</h2>

		<div class="tab-panel__scroll">
			<div class="card">
				<div class="section">
					<h3 class="section__title">{{ $t('settings.hotkeys') }}</h3>

					<div class="section__list">
						<template v-for="(hotkey, index) in hotkeys" :key="hotkey.action">
							<div v-if="index > 0" class="divider"></div>
							<HotkeyRow
								:hotkey="hotkey"
								:duplicate="isDuplicate(hotkey)"
								:assign="code => assign(hotkey, code)"
								:reset="() => reset(hotkey)"
							/>
						</template>
					</div>
				</div>
			</div>

			<div class="card">
				<div class="section">
					<h3 class="section__title">{{ $t('settings.appearance') }}</h3>

					<div class="option option--stacked" v-tooltip="$t('tooltips.theme')">
						<span class="option__icon" aria-hidden="true"><Palette /></span>
						<span class="option__text">
							<span class="option__label">{{ $t('settings.theme') }}</span>
							<span class="option__hint">{{ $t('settings.themeHint') }}</span>
						</span>
						<span class="choice" role="radiogroup" :aria-label="$t('settings.theme')">
							<button
								v-for="id in THEME_IDS"
								:key="id"
								type="button"
								class="choice__item"
								role="radio"
								:data-theme-option="id"
								:aria-checked="shell.theme.value === id"
								:tabindex="shell.theme.value === id ? -1 : 0"
								@click="shell.selectTheme(id)"
							>{{ $t(`themes.${id}`) }}</button>
						</span>
					</div>

					<div class="divider"></div>

					<div class="option option--select" v-tooltip="$t('tooltips.language')">
						<span class="option__icon" aria-hidden="true"><Languages /></span>
						<span class="option__text">
							<span class="option__label">{{ $t('settings.language') }}</span>
							<span class="option__hint">{{ $t('settings.languageHint') }}</span>
						</span>
						<LanguageSelect />
					</div>

					<div class="divider"></div>

					<OptionRow :icon="PenLine" :label="$t('settings.showSignature')" :tooltip="$t('tooltips.showSignature')">
						<ToggleSwitch option="show-signature" :checked="showSignature" @change="setShowSignature" />
					</OptionRow>
				</div>
			</div>

			<PluginRows />
		</div>
	</TabPane>
</template>
