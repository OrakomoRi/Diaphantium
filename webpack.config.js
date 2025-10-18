const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
	const isDevelopment = argv.mode === 'development';

	return {
		entry: './src/js/index.js',
		output: {
			filename: 'diaphantium.min.js',
			path: path.resolve(__dirname, 'release'),
			clean: {
				keep: /diaphantium\.user\.js$/,
			},
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env'],
						},
					},
				},
				{
					test: /\.css$/,
					use: ['style-loader', 'css-loader'],
				},
				{
					test: /\.html$/,
					loader: 'html-loader',
					options: {
						minimize: !isDevelopment,
					},
				},
				{
					test: /\.(png|jpg|jpeg|gif|svg)$/i,
					type: 'asset/inline',
				},
			],
		},
		optimization: {
			minimize: !isDevelopment,
			minimizer: [
				new TerserPlugin({
					terserOptions: {
						format: {
							comments: false,
						},
						compress: {
							drop_console: !isDevelopment,
						},
					},
					extractComments: false,
				}),
			],
		},
		devtool: isDevelopment ? 'source-map' : false,
		watch: isDevelopment,
	};
};
