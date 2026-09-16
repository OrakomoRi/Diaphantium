<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { cancelFrame, frame } from 'motion';
import { usePanelState } from '../model/panel';
import { clamp } from '../motion/springs';

const { signature, signatureText } = usePanelState();
const { visible, count, open, caret } = signature;

const slot = ref<HTMLElement | null>(null);
const caretElement = ref<HTMLElement | null>(null);
let natural = 0;

function render(): void {
	if (caretElement.value) caretElement.value.style.opacity = String(caret.get());
	const element = slot.value;
	if (!element) return;
	const amount = clamp(open.get(), 0, 1);
	if (!open.isAnimating() && (amount >= 1 || amount <= 0)) {
		natural = 0;
		element.style.height = amount >= 1 ? '' : '0px';
		element.style.visibility = amount >= 1 ? '' : 'hidden';
		return;
	}
	if (natural <= 0) natural = element.scrollHeight;
	element.style.height = `${amount * natural}px`;
	element.style.visibility = amount <= 0 ? 'hidden' : '';
}

const schedule = () => frame.render(render);
const stops = [open.on('change', schedule), open.on('animationComplete', schedule), caret.on('change', schedule)];

onMounted(render);

onBeforeUnmount(() => {
	stops.forEach(stop => stop());
	cancelFrame(render);
});
</script>

<template>
	<div ref="slot" class="popup__signature-slot">
		<div class="popup__signature" :data-text="signatureText" :aria-hidden="!visible">
			<span class="popup__signature-typed">{{ signatureText.slice(0, count) }}<span ref="caretElement" class="popup__caret"></span></span>
		</div>
	</div>
</template>
