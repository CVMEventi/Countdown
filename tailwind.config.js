import forms from '@tailwindcss/forms';

export default {
  mode: 'jit',
  content: [
    './src/renderer/**/*.{vue,js,ts,html}',
    './src/remote/**/*.{vue,js,ts,html}',
    './src/common/**/*.{vue,js,ts,html}',
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
  plugins: [
    forms,
  ]
}
