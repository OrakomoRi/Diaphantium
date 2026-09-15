import { defineConfig } from 'vite';

const iife = (entry, name, fileName) => ({
	consumer: 'client',
	build: {
		lib: {
			entry,
			name,
			formats: ['iife'],
			fileName: () => fileName,
		},
	},
});

const bundles = {
	loader: iife('src/loader.js', 'DiaphantiumLoader', 'loader.min.js'),
	clicker: iife('src/clicker.js', 'Diaphantium', 'diaphantium.min.js'),
};

export default defineConfig({
	publicDir: false,
	build: {
		emptyOutDir: false,
		reportCompressedSize: false,
	},
	environments: bundles,
	builder: {
		buildApp: async (builder) => {
			await Promise.all(Object.keys(bundles).map((name) => builder.build(builder.environments[name])));
		},
	},
});
