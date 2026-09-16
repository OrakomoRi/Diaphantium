import { cancelFrame, frame, motionValue, type MotionValue } from 'motion';
import { onBeforeUnmount, onMounted } from 'vue';

export function useMotionValues<const T extends Record<string, number>>(initial: T, render: () => void): { [K in keyof T]: MotionValue<number> } {
	const values = Object.fromEntries(Object.entries(initial).map(([key, value]) => [key, motionValue(value)])) as { [K in keyof T]: MotionValue<number> };
	const schedule = () => frame.render(render);
	const stops = Object.values<MotionValue<number>>(values).map(value => value.on('change', schedule));

	onMounted(render);

	onBeforeUnmount(() => {
		stops.forEach(stop => stop());
		cancelFrame(render);
		Object.values<MotionValue<number>>(values).forEach(value => value.destroy());
	});

	return values;
}

export function useRenderOn(value: MotionValue<number>, render: () => void): void {
	const stop = value.on('change', () => frame.render(render));
	onMounted(render);
	onBeforeUnmount(() => {
		stop();
		cancelFrame(render);
	});
}
