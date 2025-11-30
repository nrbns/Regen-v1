import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
  },
  plugins: [
    react({
      babel: {
        parserOpts: {
          plugins: ['jsx'],
        },
      },
    }),
    // Electron plugin removed - using Tauri now
  ],
  optimizeDeps: {
    exclude: ['@sentry/electron/renderer'], // Sentry is optional
    include: ['lightweight-charts'],
  },
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
    chunkSizeWarningLimit: 1000, // Increased to reduce warnings for large chunks
    rollupOptions: {
      external: [
        '@ghostery/adblocker-electron',
        '@cliqz/adblocker-electron',
        'chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
        'chromium-bidi/lib/cjs/cdp/CdpConnection',
      ],
      output: {
        // Optimize chunk names for better caching
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Optimize chunk splitting for better loading performance
        manualChunks: id => {
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // Large UI libraries - split into separate chunks
            if (id.includes('framer-motion')) {
              return 'vendor-framer-motion';
            }
            if (id.includes('lightweight-charts')) {
              return 'vendor-charts';
            }
            if (id.includes('reactflow')) {
              return 'vendor-reactflow';
            }
            // React and React DOM - core, load first
            if (id.includes('react-dom')) {
              return 'vendor-react-dom';
            }
            if (id.includes('react') && !id.includes('react-dom')) {
              return 'vendor-react';
            }
            // Router - load early
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Large libraries - lazy load
            if (id.includes('pdfjs-dist') || id.includes('pdf.worker')) {
              return 'vendor-pdf';
            }
            if (id.includes('mammoth')) {
              return 'vendor-mammoth';
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
