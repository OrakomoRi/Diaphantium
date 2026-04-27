const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
	const isDevelopment = argv.mode === 'development';

	return {
		entry: {
			loader: './src/loader.js',
			diaphantium: './src/clicker.js',
		},
		output: {
			filename: '[name].min.js',
			path: isDevelopment ? path.resolve(__dirname, 'dist') : path.resolve(__dirname, 'dist'),
			clean: isDevelopment,
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
