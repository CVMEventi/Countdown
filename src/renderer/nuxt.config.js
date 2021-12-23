/**
 * By default, Nuxt.js is configured to cover most use cases.
 * This default configuration can be overwritten in this file
 * @link {https://nuxtjs.org/guide/configuration/}
 */

module.exports = {
  ssr: false,
  target: 'static',
  head: {
    title: 'countdown',
    meta: [{ charset: 'utf-8' }]
  },
  loading: false,
  plugins: [
    { ssr: true, src: '@/plugins/icons.js' }
  ],
  css: [
    '~/assets/css/main.css',
  ],
  buildModules: [
    '@nuxt/postcss8'
  ],
  build: {
    postcss: {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      }
    }
  },
  modules: [

  ]
}
