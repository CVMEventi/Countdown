import { Configuration } from 'webpack';
import { rules } from "./webpack.rules";

rules.push({
  test: /\.(woff|woff2|eot|ttf|otf|png|jpeg|jpg|mp3)$/i,
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
    grandiose: 'grandiose'
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  output: {
    // [file] is the key thing here. [query] and [fragment] are optional
    assetModuleFilename: '[file][query][fragment]',
  },
};
