import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'serve-remote-root',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/') req.url = '/src/remote/index.html';
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
    },
    dedupe: ['vue', 'vue-router', 'pinia'],
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'src/remote/index.html'),
    },
  },
});
