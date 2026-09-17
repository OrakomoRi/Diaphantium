import type Clicker from './clicker/core/Clicker';
import type { DiaphantiumPluginApi } from './clicker/plugins/types';

declare global {
	const __DIAPHANTIUM_BUILD__: string;
	const __DIAPHANTIUM_RELEASE_DATE__: string;

	interface DiaphantiumRuntime {
		readonly version: string | null;
		readonly source?: string;
		readonly plugins: DiaphantiumPluginApi & { onReady(callback: () => void): void };
	}

	interface Window {
		__DIAPHANTIUM__?: Readonly<DiaphantiumRuntime>;
		clickerInstance?: Clicker;
	}
}

export {};
