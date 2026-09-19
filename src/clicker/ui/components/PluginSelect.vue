<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { frame } from 'motion';
import { Select, createListCollection, type SelectValueChangeDetails } from '@ark-ui/vue';
import { Check, ChevronDown } from '@lucide/vue';
import { useThemeContext } from '../model/panel';
import type { PluginOption } from '../model/pluginsTab';
import { SELECT_POSITIONING } from './selectPositioning';
import { useSelectHighlight } from './selectHighlight';

const props = defineProps<{ options: PluginOption[]; modelValue: string | null }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const { root: themeRoot } = useThemeContext();

const collection = computed(() => createListCollection<PluginOption>({
	items: props.options,
	itemToValue: item => item.id,
	itemToString: item => item.label,
}));

const current = computed(() => props.options.find(option => option.id === props.modelValue));

const currentValue = ref<HTMLElement | null>(null);
const truncated = ref(false);
let observer: ResizeObserver | null = null;

function checkTruncated(): void {
	const element = currentValue.value;
	truncated.value = !!element && element.scrollWidth > element.clientWidth;
}

onMounted(() => {
	checkTruncated();
	observer = new ResizeObserver(checkTruncated);
	if (currentValue.value) observer.observe(currentValue.value);
});
onBeforeUnmount(() => observer?.disconnect());
watch(current, () => frame.read(checkTruncated));

const { highlight, onOpenChange, onHighlightChange } = useSelectHighlight(() => props.modelValue, 'data-plugin-option');

function onValueChange(details: SelectValueChangeDetails<PluginOption>): void {
	const next = details.value[0];
	if (next) emit('update:modelValue', next);
}
</script>

<template>
	<Select.Root
		class="select select--plugin"
		:collection="collection"
		:model-value="modelValue ? [modelValue] : []"
		:positioning="SELECT_POSITIONING"
		loop-focus
		@value-change="onValueChange"
		@open-change="onOpenChange"
		@highlight-change="onHighlightChange"
	>
		<Select.Control class="select__control">
			<Select.Trigger class="select__trigger" data-plugin-select :aria-label="$t('plugins.picker')">
				<span class="select__value">
					<span v-for="item in collection.items" :key="item.id" class="select__sizer" :data-text="item.label" aria-hidden="true"></span>
					<span ref="currentValue" class="select__current" v-tooltip="truncated ? current?.label : null">{{ current?.label }}</span>
				</span>
				<Select.Indicator class="select__indicator"><ChevronDown /></Select.Indicator>
			</Select.Trigger>
		</Select.Control>
		<Teleport :to="themeRoot" :disabled="!themeRoot">
			<Select.Positioner class="select__positioner">
				<Select.Content class="select__content" data-no-drag>
					<span ref="highlight" class="select__highlight" aria-hidden="true"></span>
					<Select.Item v-for="item in collection.items" :key="item.id" :item="item" class="select__item" :data-plugin-option="item.id">
						<span class="select__item-mark"><Select.ItemIndicator class="select__item-indicator"><Check /></Select.ItemIndicator></span>
						<Select.ItemText class="select__item-text">{{ item.label }}</Select.ItemText>
					</Select.Item>
				</Select.Content>
			</Select.Positioner>
		</Teleport>
	</Select.Root>
</template>
