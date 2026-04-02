import {VueLoaderPlugin} from "vue-loader";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
const isProd = process.env.NODE_ENV === 'production';
import {Configuration, DefinePlugin} from 'webpack';
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const rendererConfig: Configuration = {
  target: 'electron-renderer',
  // Put your normal webpack config below here
  module: {
    rules: [
      {
        test: /native_modules[/\\].+\.node$/,
        use: 'node-loader',
      },
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|\.webpack)/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          "css-loader",
          'postcss-loader',
        ],
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|png|jpeg|jpg|mp3)$/i,
        type: 'asset/resource',
      },
    ],
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
    new DefinePlugin({
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    })
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      '@': path.resolve(__dirname, 'src/renderer'),
      '@common': path.resolve(__dirname, 'src/common'),
    },
    extensions: ['.js', '.ts', '.vue', '.css'],
  },
};

