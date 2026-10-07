import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind to all interfaces so the sandbox preview proxy can reach the dev server.
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // The preview is served from a proxied host (https://<port>-<sandbox>.e2b.app),
    // so the Host header never matches "localhost".
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
});
