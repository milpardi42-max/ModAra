import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // The dev server always runs at "/", while the production build defaults to
  // "/Modara/" because GitHub Pages serves this repository under that sub path.
  // Build with BASE_PATH=/ when deploying to a custom domain or root host.
  base: command === 'build' ? process.env.BASE_PATH ?? '/Modara/' : '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // allow the sandbox/preview proxy hosts (e2b, ngrok-style tunnels, LAN)
    allowedHosts: true,
    hmr: { clientPort: 443 },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
}));
