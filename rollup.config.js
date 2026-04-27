import { glob } from 'glob';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function globImport() {
	return {
		name: 'glob-import',
		resolveId(id) {
			if (id.includes('*')) return { id, external: false };
		},
		load(id) {
			if (!id.includes('*')) return;

			const pattern = id.startsWith('./')
				? path.join(__dirname, 'src', id.slice(2))
				: id;

			const files = glob.sync(pattern, { windowsPathsNoEscape: true }).filter(f => f.endsWith('.js'));

			return files
				.map(f => `import '${path.resolve(f).replace(/\\/g, '/')}';`)
				.join('\n');
		}
	};
}

function htmlImport() {
	return {
		name: 'html-import',
		transform(code, id) {
			if (!id.endsWith('.html')) return null;
			return {
				code: `export default ${JSON.stringify(code)};`,
				map: { mappings: '' }
			};
		}
	};
}

const sharedPlugins = [
	globImport(),
	terser({ format: { comments: false } }),
];

const loaderConfig = {
	input: 'src/loader.js',
	output: {
		file: 'dist/loader.min.js',
		format: 'iife',
		name: 'DiaphantiumLoader',
	},
	plugins: sharedPlugins,
};

const clickerConfig = {
	input: 'src/clicker.js',
	output: {
		file: 'dist/diaphantium.min.js',
		format: 'iife',
		name: 'Diaphantium',
	},
	plugins: [
		htmlImport(),
		postcss({ inject: true, minimize: true }),
		terser({ format: { comments: false } }),
	],
};

export default [loaderConfig, clickerConfig];
