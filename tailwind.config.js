module.exports = {
  mode: 'jit',
  content: [
    './src/renderer/components/**/*.{vue,js}',
    './src/renderer/layouts/**/*.vue',
    './src/renderer/pages/**/*.vue',
    './src/renderer/plugins/**/*.{js,ts}',
    './src/renderer/nuxt.config.{js,ts}'
  ],
  theme: {
    extend: {
      fontSize: {
        '10xl': '10rem',
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
}
