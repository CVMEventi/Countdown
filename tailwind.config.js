module.exports = {
  mode: 'jit',
  content: [
    './src/renderer/**/*.{vue,js,html}',
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
