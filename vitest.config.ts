import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			'@': path('src'),
		},
	},
	test: {
		restoreMocks: true,
		unstubGlobals: true,
		environment: 'happy-dom',
		include: ['tests/unit/**/*.test.ts'],
	},
});
