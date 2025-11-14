import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ['jsx']
        }
      }
    }),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron', 'electron-updater', 'jsdom', 'canvas', 'bufferutil', 'utf-8-validate'],
              output: {
                entryFileNames: 'main.js',
                format: 'cjs',
              },
            }
          }
        }
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
  esbuild: {
    target: 'es2020', // Helps with JSX parsing
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist-web',
    sourcemap: true,
    emptyOutDir: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      external: [
        '@ghostery/adblocker-electron',
        '@cliqz/adblocker-electron',
        'chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
        'chromium-bidi/lib/cjs/cdp/CdpConnection'
      ],
    }
  },
  optimizeDeps: {
    exclude: ['electron'],
    include: ['lightweight-charts']
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
      '@': resolve(__dirname, './src'),
      canvas: resolve(__dirname, './stubs/canvas-stub/index.js'),
      bufferutil: resolve(__dirname, './stubs/bufferutil-stub/index.js'),
      'utf-8-validate': resolve(__dirname, './stubs/utf-8-validate-stub/index.js'),
      './xhr-sync-worker.js': resolve(__dirname, './stubs/xhr-sync-worker.js')
    }
  }
});


