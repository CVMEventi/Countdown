module.exports = {
  mode: 'jit',
  content: [
    './src/renderer/**/*.{vue,js,html}',
  ],
  theme: {
    extend: {
      fontSize: {
        '10xl': '10rem',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;',
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
}
