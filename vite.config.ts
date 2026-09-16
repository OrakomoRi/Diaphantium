import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type EnvironmentOptions } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

function iife(entry: string, name: string, fileName: string): EnvironmentOptions {
	return {
		consumer: 'client',
		build: {
			lib: {
				entry: path(entry),
				name,
				formats: ['iife'],
				fileName: () => fileName,
			},
		},
	};
}

const { version } = JSON.parse(readFileSync(path('package.json'), 'utf8')) as { version: string };

function releaseDate(): string {
	try {
		const date = execFileSync('git', ['log', '-1', '--format=%ad', '--date=short'], { encoding: 'utf8' }).trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
	} catch {}
	return new Date().toISOString().slice(0, 10);
}

const bundles = {
	loader: iife('src/loader/main.ts', 'DiaphantiumLoader', 'loader.min.js'),
	updateToast: iife('src/update-toast/main.ts', 'DiaphantiumUpdateToast', 'update-toast.min.js'),
	clicker: iife('src/clicker/main.ts', 'Diaphantium', 'diaphantium.min.js'),
};

export default defineConfig({
	publicDir: false,
	plugins: [
		vue(),
		VueI18nPlugin({
			module: 'petite-vue-i18n',
			include: [path('src/clicker/locales/lang/**')],
			fullInstall: false,
			dropMessageCompiler: true,
		}),
	],
	resolve: {
		alias: {
			'@': path('src'),
		},
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify('production'),
		__DIAPHANTIUM_BUILD__: JSON.stringify(version),
		__DIAPHANTIUM_RELEASE_DATE__: JSON.stringify(releaseDate()),
		__VUE_OPTIONS_API__: 'false',
		__VUE_PROD_DEVTOOLS__: 'false',
		__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
		__INTLIFY_PROD_DEVTOOLS__: 'false',
	},
	build: {
		target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
		emptyOutDir: false,
		reportCompressedSize: false,
		minify: 'terser',
		terserOptions: {
			ecma: 2020,
			toplevel: true,
			compress: { passes: 3 },
			mangle: { toplevel: true },
			format: { comments: false },
		},
	},
	preview: {
		port: 4173,
		strictPort: true,
	},
	environments: bundles,
	builder: {
		buildApp: async builder => {
			await Promise.all(Object.keys(bundles).map(name => {
				const environment = builder.environments[name];
				if (!environment) throw new Error(`Unknown build environment: ${name}`);
				return builder.build(environment);
			}));
		},
	},
});
