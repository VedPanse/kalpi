import { defineConfig } from 'vite';

// The Python helper (server/server.py) reads Shopify and serves product images.
// During development, Vite forwards those two routes to it.
const API = 'http://127.0.0.1:8790';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/img': API,
      '/models': API,
    },
  },
});
