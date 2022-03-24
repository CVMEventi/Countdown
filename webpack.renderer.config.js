const rules = require('./webpack.rules');
const { VueLoaderPlugin } = require('vue-loader')

rules.push({
  test: /\.css$/i,
  use: [
    "style-loader",
    "css-loader",
    'postcss-loader',
  ],
});

rules.push({
  test: /\.vue$/,
  loader: 'vue-loader'
})

module.exports = {
  target: 'electron-renderer',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    // make sure to include the plugin!
    new VueLoaderPlugin()
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js'
    },
    extensions: ['.js', '.vue'],
  },
};
