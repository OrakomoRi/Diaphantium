import { onBeforeUnmount, onMounted, type Ref } from 'vue';

type Target = Ref<HTMLElement | null> | (() => HTMLElement | null);

function resolve(target: Target): HTMLElement | null {
	return typeof target === 'function' ? target() : target.value;
}

export function useHover(target: Target, onChange: (hovered: boolean) => void): void {
	let element: HTMLElement | null = null;
	let hovered = false;

	function set(next: boolean): void {
		if (hovered === next) return;
		hovered = next;
		onChange(next);
	}

	function onEnter(event: PointerEvent): void {
		if (event.pointerType !== 'touch') set(true);
	}

	function onLeave(): void {
		set(false);
	}

	onMounted(() => {
		element = resolve(target);
		element?.addEventListener('pointerenter', onEnter);
		element?.addEventListener('pointerleave', onLeave);
	});

	onBeforeUnmount(() => {
		element?.removeEventListener('pointerenter', onEnter);
		element?.removeEventListener('pointerleave', onLeave);
		element = null;
	});
}

export function usePress(target: Target, onChange: (pressed: boolean) => void): void {
	let element: HTMLElement | null = null;
	let pressed = false;

	function end(): void {
		window.removeEventListener('pointerup', end, true);
		window.removeEventListener('pointercancel', end, true);
		if (!pressed) return;
		pressed = false;
		onChange(false);
	}

	function onDown(event: PointerEvent): void {
		if (!event.isPrimary || event.button !== 0 || pressed) return;
		pressed = true;
		window.addEventListener('pointerup', end, true);
		window.addEventListener('pointercancel', end, true);
		onChange(true);
	}

	onMounted(() => {
		element = resolve(target);
		element?.addEventListener('pointerdown', onDown);
	});

	onBeforeUnmount(() => {
		element?.removeEventListener('pointerdown', onDown);
		element = null;
		end();
	});
}
