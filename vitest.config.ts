import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
    },
  },
  test: {
    globals: true,
  },
});
