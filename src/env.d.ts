declare global {
	const __DIAPHANTIUM_BUILD__: string;
	const __DIAPHANTIUM_RELEASE_DATE__: string;

	interface DiaphantiumRuntime {
		readonly version: string | null;
		readonly source?: string;
	}

	interface Window {
		__DIAPHANTIUM__?: Readonly<DiaphantiumRuntime>;
		clickerInstance?: unknown;
	}
}

export {};
