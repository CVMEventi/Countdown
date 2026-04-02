import { Configuration } from 'webpack';
import { rules } from "./webpack.rules.ts";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

rules.push({
  test: /\.(woff|woff2|eot|ttf|otf|png|jpeg|jpg|mp3|ico)$/i,
  type: 'asset/resource',
})

export const mainConfig: Configuration = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.ts',
  // Put your normal webpack config below here
  module: {
    rules: rules,
  },
  externals: {
    grandiose: 'grandiose',
    bufferutil: 'bufferutil',
    'utf-8-validate': 'utf-8-validate',
  },
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  output: {
    // [file] is the key thing here. [query] and [fragment] are optional
    assetModuleFilename: '[file][query][fragment]',
    filename: 'index.cjs',
  },
};
