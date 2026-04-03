import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { builtinModules } from 'module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
    },
  },
  assetsInclude: ["**/*.png", "**/*.ico"],
  build: {
    lib: {
      entry: 'src/main/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'grandiose',
        'bufferutil',
        'utf-8-validate',
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
      ],
      output: {
        banner: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
      },
    },
  },
});
