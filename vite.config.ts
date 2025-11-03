import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: {
          index: resolve(__dirname, 'electron/preload.ts'),
        },
      },
      // Use existing preload.cjs as fallback for compatibility
      renderer: {},
    }),
  ],
  root: resolve(__dirname),
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});


