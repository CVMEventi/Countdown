import { rules } from './webpack.rules';
const { VueLoaderPlugin } = require('vue-loader')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const isProd = process.env.NODE_ENV === 'production';
import {Configuration} from 'webpack';

rules.push({
  test: /\.css$/i,
  use: [
    isProd ? MiniCssExtractPlugin.loader : 'style-loader',
    "css-loader",
    'postcss-loader',
  ],
});

rules.push({
  test: /\.vue$/,
  loader: 'vue-loader'
})

rules.push({
  test: /\.(woff|woff2|eot|ttf|otf|png|jpeg|jpg|mp3)$/i,
  type: 'asset/resource',
})

export const rendererConfig: Configuration = {
  target: 'electron-renderer',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  optimization: {
    minimizer: [
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    // make sure to include the plugin!
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin(),
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js'
    },
    extensions: ['.js', '.ts', '.vue', '.css'],
  },
};

