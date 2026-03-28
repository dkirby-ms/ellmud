import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      // Proxy server auth API routes — but NOT /auth/callback (React route)
      '/auth/register': { target: 'http://localhost:2567' },
      '/auth/login': { target: 'http://localhost:2567' },
      '/auth/logout': { target: 'http://localhost:2567' },
      '/auth/me': { target: 'http://localhost:2567' },
      '/auth/entra': { target: 'http://localhost:2567' },
      '/api': { target: 'http://localhost:2567' },
      '/admin/api': { target: 'http://localhost:2567' },
      '/colyseus': {
        target: 'http://localhost:2567',
        ws: true,
      },
    },
  },
});
