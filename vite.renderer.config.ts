import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'serve-renderer-root',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (new URL(req.url ?? '/', 'http://localhost').pathname === '/') req.url = '/src/renderer/index.html';
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@common': path.resolve(__dirname, 'src/common'),
    },
    dedupe: ['vue', 'vue-router', 'pinia'],
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'src/renderer/index.html'),
    },
  },
});
