import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/deezer': { target: 'https://api.deezer.com', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/deezer/, '') },
      '/api/itunes': { target: 'https://itunes.apple.com', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/itunes/, '') },
      '/api/open-library': { target: 'https://openlibrary.org', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/open-library/, '') },
      '/api/google-books': { target: 'https://www.googleapis.com', changeOrigin: true, rewrite: (path) => path.replace(/^\/api\/google-books/, '') },
    },
  },
});
