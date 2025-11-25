import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  optimizeDeps: {
    exclude: ['@sentry/electron/renderer'], // Sentry is optional
  },
  build: {
    rollupOptions: {
      external: id => {
        // Make Sentry optional - don't fail build if not installed
        if (id.includes('@sentry/electron/renderer')) {
          return false; // Still bundle, but handle gracefully
        }
        return false;
      },
    },
  },
  server: {
    port: 5183,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
