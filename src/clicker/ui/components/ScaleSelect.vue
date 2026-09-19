<script setup lang="ts">
import { computed } from 'vue';
import { Select, createListCollection, type SelectValueChangeDetails } from '@ark-ui/vue';
import { Check, ChevronDown } from '@lucide/vue';
import { useThemeContext } from '../model/panel';
import { useInterfaceScaleSetting, type ScaleOption } from '../model/scale';
import { SELECT_POSITIONING } from './selectPositioning';
import { useSelectHighlight } from './selectHighlight';

const scale = useInterfaceScaleSetting();
const { root: themeRoot } = useThemeContext();

const collection = computed(() => createListCollection<ScaleOption>({
	items: scale.options,
	itemToValue: item => item.id,
	itemToString: item => item.label,
}));

const current = computed(() => scale.options.find(option => option.id === scale.choice.value));

const { highlight, onOpenChange, onHighlightChange } = useSelectHighlight(() => scale.choice.value, 'data-scale-option');

function onValueChange(details: SelectValueChangeDetails<ScaleOption>): void {
	const next = details.value[0];
	if (next) scale.select(next);
}
</script>

<template>
	<Select.Root
		class="select select--scale"
		:collection="collection"
		:model-value="[scale.choice.value]"
		:positioning="SELECT_POSITIONING"
		loop-focus
		@value-change="onValueChange"
		@open-change="onOpenChange"
		@highlight-change="onHighlightChange"
	>
		<Select.Control class="select__control">
			<Select.Trigger class="select__trigger" data-scale-select :aria-label="$t('settings.interfaceScale')">
				<span class="select__value">
					<span v-for="item in collection.items" :key="item.id" class="select__sizer" :data-text="item.label" aria-hidden="true"></span>
					<span class="select__current">{{ current?.label }}</span>
				</span>
				<Select.Indicator class="select__indicator"><ChevronDown /></Select.Indicator>
			</Select.Trigger>
		</Select.Control>
		<Teleport :to="themeRoot" :disabled="!themeRoot">
			<Select.Positioner class="select__positioner">
				<Select.Content class="select__content" data-no-drag>
					<span ref="highlight" class="select__highlight" aria-hidden="true"></span>
					<Select.Item v-for="item in collection.items" :key="item.id" :item="item" class="select__item" :data-scale-option="item.id">
						<span class="select__item-mark"><Select.ItemIndicator class="select__item-indicator"><Check /></Select.ItemIndicator></span>
						<Select.ItemText class="select__item-text">{{ item.label }}</Select.ItemText>
					</Select.Item>
				</Select.Content>
			</Select.Positioner>
		</Teleport>
	</Select.Root>
</template>
