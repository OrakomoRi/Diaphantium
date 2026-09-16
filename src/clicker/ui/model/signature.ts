import { readonly, ref, type Ref } from 'vue';
import { motionValue, type MotionValue } from 'motion';
import { createTypewriter } from '../motion/typewriter';
import { prefersReducedMotion, toValue } from '../motion/springs';

export const SIGNATURE_MOTION = {
	caretLingerMs: 450,
	caretFade: { visualDuration: 0.25, bounce: 0 },
	slot: { visualDuration: 0.3, bounce: 0 },
} as const;

export interface SignatureState {
	visible: Readonly<Ref<boolean>>;
	count: Readonly<Ref<number>>;
	open: MotionValue<number>;
	caret: MotionValue<number>;
	show: (visible: boolean) => void;
	refresh: () => void;
	destroy: () => void;
}

export function createSignatureState(initiallyVisible: boolean, text: () => string): SignatureState {
	const visible = ref(initiallyVisible);
	const count = ref(initiallyVisible ? text().length : 0);
	const open = motionValue(initiallyVisible ? 1 : 0);
	const caret = motionValue(0);
	let busy = false;
	let erased = !initiallyVisible;
	let lingerTimer: ReturnType<typeof setTimeout> | undefined;

	function setCaret(on: boolean): void {
		clearTimeout(lingerTimer);
		if (on) {
			caret.jump(1);
			return;
		}
		lingerTimer = setTimeout(() => toValue(caret, 0, SIGNATURE_MOTION.caretFade), SIGNATURE_MOTION.caretLingerMs);
	}

	function collapse(): void {
		toValue(open, 0, SIGNATURE_MOTION.slot);
	}

	const typewriter = createTypewriter({
		text,
		visible: initiallyVisible,
		instant: prefersReducedMotion,
		render: frame => {
			count.value = frame.count;
			if (frame.busy !== busy) setCaret(frame.busy);
			busy = frame.busy;
			erased = frame.count === 0 && !frame.busy;
			if (erased && !visible.value) collapse();
		},
	});

	function show(next: boolean): void {
		visible.value = next;
		if (!next) {
			if (erased) collapse();
			else typewriter.show(false);
			return;
		}
		if (open.get() >= 1 && !open.isAnimating()) {
			typewriter.show(true);
			return;
		}
		toValue(open, 1, SIGNATURE_MOTION.slot).then(() => {
			if (visible.value && open.get() >= 1) typewriter.show(true);
		});
	}

	return {
		visible: readonly(visible),
		count: readonly(count),
		open,
		caret,
		show,
		refresh: () => typewriter.refresh(),
		destroy() {
			typewriter.destroy();
			clearTimeout(lingerTimer);
			open.destroy();
			caret.destroy();
		},
	};
}
