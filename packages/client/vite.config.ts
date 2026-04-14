import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootPkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8'),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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
