<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';
import type { TabName } from '../../../model/panel';
import { clamp, smoothstep, toValue } from '../../../motion/springs';
import { useMotionValues } from '../../../motion/values';
import { SPRINGS } from '../springs';
import { TAB_STACK } from './TabStack.vue';

const OFFSET = 16;

const props = defineProps<{ name: TabName }>();

const stack = inject(TAB_STACK);
if (!stack) throw new Error('TabPane needs a TabStack');

const section = ref<HTMLElement | null>(null);
const initiallyActive = stack.isActive(props.name);
const values = useMotionValues({ y: 0, shown: initiallyActive ? 1 : 0 }, render);

function render(): void {
	const element = section.value;
	if (!element) return;
	const shown = clamp(values.shown.get(), 0, 1);
	element.style.opacity = shown >= 1 ? '' : String(smoothstep((shown - 0.5) / 0.5));
	const y = values.y.get();
	element.style.transform = Math.abs(y) < 0.01 ? '' : `translate3d(0, ${y}px, 0)`;
	element.style.visibility = shown <= 0.01 && element.inert ? 'hidden' : '';
}

let unregister: (() => void) | null = null;

onMounted(() => {
	if (section.value) section.value.inert = !initiallyActive;
	render();
	unregister = stack.register(props.name, {
		element: () => section.value,
		show(direction, instant) {
			const element = section.value;
			if (!element) return;
			element.inert = false;
			if (instant) {
				values.y.jump(0);
				values.shown.jump(1);
				return;
			}
			if (values.shown.get() <= 0.01) values.y.jump(direction * OFFSET);
			toValue(values.y, 0, SPRINGS.pane);
			toValue(values.shown, 1, SPRINGS.paneFade);
		},
		hide(direction) {
			const element = section.value;
			if (!element) return;
			element.inert = true;
			toValue(values.y, -direction * OFFSET, SPRINGS.pane);
			toValue(values.shown, 0, SPRINGS.paneFade);
		},
	});
});

onBeforeUnmount(() => unregister?.());
</script>

<template>
	<section ref="section" class="tab-panel" role="tabpanel" :data-tab="name">
		<slot />
	</section>
</template>
