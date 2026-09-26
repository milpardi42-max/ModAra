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
    // lucide-react's ESM entry imports one module per icon (~1500 files).
    // Pre-bundling it keeps the dev server / in-browser IDE from firing
    // hundreds of requests before the first paint.
    include: ['lucide-react', 'react', 'react-dom', 'react-dom/client'],
  },
  build: {
    // Modern syntax only: smaller output, no legacy transpilation tax.
    target: 'es2020',
    cssCodeSplit: true,
    // Browsers that understand <link rel="modulepreload"> do not need the polyfill.
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // React is stable across deploys: a separate chunk keeps it cached.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || /[\\/]react[\\/]/.test(id) || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
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
