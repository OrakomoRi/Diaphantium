<script setup lang="ts">
import { computed, ref } from 'vue';
import { frame } from 'motion';
import { Select, createListCollection, type SelectHighlightChangeDetails, type SelectOpenChangeDetails, type SelectValueChangeDetails } from '@ark-ui/vue';
import { Check, ChevronDown } from '@lucide/vue';
import { isLanguageChoice } from '../../locales';
import { useLanguageSetting, type LanguageOption } from '../model/language';
import { useThemeContext } from '../model/panel';
import { clamp, toValue } from '../motion/springs';
import { useMotionValues } from '../motion/values';

const language = useLanguageSetting();
const { theme, root: themeRoot } = useThemeContext();

const collection = computed(() => createListCollection<LanguageOption>({
	items: language.options.value,
	itemToValue: item => item.id,
	itemToString: item => item.name,
}));

const current = computed(() => language.options.value.find(option => option.id === language.choice.value));

const highlight = ref<HTMLElement | null>(null);
let highlightHeight = 0;
let placed = false;

const values = useMotionValues({ y: 0, shown: 0 }, () => {
	const element = highlight.value;
	if (!element) return;
	element.style.height = `${highlightHeight}px`;
	element.style.transform = `translate3d(0, ${values.y.get()}px, 0)`;
	element.style.opacity = String(clamp(values.shown.get(), 0, 1));
});

function onValueChange(details: SelectValueChangeDetails<LanguageOption>): void {
	const next = details.value[0];
	if (isLanguageChoice(next)) language.select(next);
}

function onOpenChange(details: SelectOpenChangeDetails): void {
	if (details.open) return;
	placed = false;
	values.shown.jump(0);
}

function onHighlightChange(details: SelectHighlightChangeDetails<LanguageOption>): void {
	frame.read(() => {
		const list = highlight.value?.parentElement;
		const selectable = details.highlightedValue !== null && details.highlightedValue !== language.choice.value;
		const item = selectable ? list?.querySelector<HTMLElement>(`[data-language-option="${details.highlightedValue}"]`) : null;
		if (!item || item.offsetHeight === 0) {
			toValue(values.shown, 0, theme.highlight);
			return;
		}
		highlightHeight = item.offsetHeight;
		if (placed && values.shown.get() > 0) {
			toValue(values.y, item.offsetTop, theme.highlight);
		} else {
			values.y.jump(item.offsetTop);
			placed = true;
		}
		toValue(values.shown, 1, theme.highlight);
	});
}
</script>

<template>
	<Select.Root
		class="select"
		:collection="collection"
		:model-value="[language.choice.value]"
		:positioning="{ placement: 'bottom-end', gutter: 6, flip: true, sameWidth: true }"
		loop-focus
		@value-change="onValueChange"
		@open-change="onOpenChange"
		@highlight-change="onHighlightChange"
	>
		<Select.Control class="select__control">
			<Select.Trigger class="select__trigger" data-language-select :aria-label="$t('settings.language')">
				<span class="select__value">
					<span v-for="item in collection.items" :key="item.id" class="select__sizer" :data-text="item.name" aria-hidden="true"></span>
					<span class="select__current">{{ current?.name }}</span>
				</span>
				<Select.Indicator class="select__indicator"><ChevronDown /></Select.Indicator>
			</Select.Trigger>
		</Select.Control>
		<Teleport :to="themeRoot" :disabled="!themeRoot">
			<Select.Positioner class="select__positioner">
				<Select.Content class="select__content" data-no-drag>
					<span ref="highlight" class="select__highlight" aria-hidden="true"></span>
					<Select.Item v-for="item in collection.items" :key="item.id" :item="item" class="select__item" :data-language-option="item.id">
						<span class="select__item-mark"><Select.ItemIndicator class="select__item-indicator"><Check /></Select.ItemIndicator></span>
						<Select.ItemText class="select__item-text">{{ item.name }}</Select.ItemText>
						<span v-if="item.id !== 'auto'" class="select__item-code" aria-hidden="true">{{ item.label }}</span>
					</Select.Item>
				</Select.Content>
			</Select.Positioner>
		</Teleport>
	</Select.Root>
</template>
