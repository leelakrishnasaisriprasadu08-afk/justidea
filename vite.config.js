import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sandbox preview only: allow the proxied preview host through Vite's host check.
// With BASE44_PREVIEW_MODE unset the list stays empty and normal behavior applies.
const previewHosts =
  process.env.BASE44_PREVIEW_MODE === '1'
    ? [process.env.BASE44_PUBLIC_HOST_SUFFIX, process.env.BASE44_SANDBOX_HOST_DOMAIN]
        .filter(Boolean)
        .map((host) => `.${host}`)
    : [];

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: previewHosts,
    watch: { usePolling: true },
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
