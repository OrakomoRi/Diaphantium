import { ref, type Ref } from 'vue';
import { frame } from 'motion';
import type { SelectHighlightChangeDetails, SelectOpenChangeDetails } from '@ark-ui/vue';
import { useThemeContext } from '../model/panel';
import { clamp, toValue } from '../motion/springs';
import { useMotionValues } from '../motion/values';

export interface SelectHighlight {
	highlight: Ref<HTMLElement | null>;
	onOpenChange: (details: SelectOpenChangeDetails) => void;
	onHighlightChange: (details: SelectHighlightChangeDetails) => void;
}

export function useSelectHighlight(selected: () => string | null, optionAttribute: string): SelectHighlight {
	const { theme } = useThemeContext();
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

	function onOpenChange(details: SelectOpenChangeDetails): void {
		if (details.open) return;
		placed = false;
		values.shown.jump(0);
	}

	function onHighlightChange(details: SelectHighlightChangeDetails): void {
		frame.read(() => {
			const list = highlight.value?.parentElement;
			const selectable = details.highlightedValue !== null && details.highlightedValue !== selected();
			const item = selectable ? list?.querySelector<HTMLElement>(`[${optionAttribute}="${details.highlightedValue}"]`) : null;
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

	return { highlight, onOpenChange, onHighlightChange };
}
