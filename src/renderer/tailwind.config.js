module.exports = {
  mode: 'jit',
  content: [
    'components/**/*.{vue,js}',
    'layouts/**/*.vue',
    'pages/**/*.vue',
    'plugins/**/*.{js,ts}',
    'nuxt.config.{js,ts}'
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
