import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ['jsx'],
        },
      },
    }),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                'electron',
                'electron-updater',
                'jsdom',
                'canvas',
                'bufferutil',
                'utf-8-validate',
                'better-sqlite3',
              ],
              output: {
                entryFileNames: 'main.js',
                format: 'cjs',
              },
            },
          },
        },
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
        'chromium-bidi/lib/cjs/cdp/CdpConnection',
      ],
      output: {
        manualChunks: id => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // Large UI libraries
            if (id.includes('framer-motion')) {
              return 'vendor-framer-motion';
            }
            if (id.includes('lightweight-charts')) {
              return 'vendor-charts';
            }
            if (id.includes('reactflow')) {
              return 'vendor-reactflow';
            }
            if (id.includes('pdfjs-dist') || id.includes('pdf.worker')) {
              return 'vendor-pdf';
            }
            if (id.includes('mammoth')) {
              return 'vendor-mammoth';
            }
            // React and core deps
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Langchain and AI deps
            if (id.includes('langchain') || id.includes('@langchain')) {
              return 'vendor-langchain';
            }
            // Zustand state management
            if (id.includes('zustand')) {
              return 'vendor-zustand';
            }
            // Lucide icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Other large vendors
            if (id.includes('date-fns') || id.includes('lodash') || id.includes('lunr')) {
              return 'vendor-utils';
            }
            // Everything else from node_modules
            return 'vendor';
          }
          // Split mode components (already handled by lazy loading, but ensure they're in separate chunks)
          if (id.includes('/modes/')) {
            const modeMatch = id.match(/\/modes\/([^/]+)/);
            if (modeMatch) {
              return `mode-${modeMatch[1]}`;
            }
          }
          // Split core AI components
          if (id.includes('/core/ai/') || id.includes('/core/agents/')) {
            return 'core-ai';
          }
          // Split SuperMemory components
          if (id.includes('/core/supermemory/')) {
            return 'core-memory';
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['electron'],
    include: ['lightweight-charts'],
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      canvas: resolve(__dirname, './stubs/canvas-stub/index.js'),
      bufferutil: resolve(__dirname, './stubs/bufferutil-stub/index.js'),
      'utf-8-validate': resolve(__dirname, './stubs/utf-8-validate-stub/index.js'),
      './xhr-sync-worker.js': resolve(__dirname, './stubs/xhr-sync-worker.js'),
    },
  },
});
