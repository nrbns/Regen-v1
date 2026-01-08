import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      // Fast Refresh is enabled by default in @vitejs/plugin-react
      // Explicitly enable Fast Refresh for better HMR
      jsxRuntime: 'automatic',
      // Include all JSX/TSX files for Fast Refresh
      include: '**/*.{jsx,tsx}',
      babel: {
        parserOpts: {
          plugins: ['jsx'],
        },
      },
    }),
    // Electron plugin removed - using Tauri now
  ],
  optimizeDeps: {
    exclude: ['@sentry/electron/renderer', '@tauri-apps/api', 'jsdom', 'cssstyle'], // Sentry and Tauri API are optional, exclude jsdom/cssstyle
    include: ['lightweight-charts'],
    // Reduce HMR overhead in development
    force: process.env.NODE_ENV === 'production',
  },
  resolve: {
    alias: {
    '@': resolve(__dirname, './src'),
    '@lib': resolve(__dirname, './src/lib'),
      '@shared': resolve(__dirname, './packages/shared'),
      // v1 shims to neutralize heavy UI libraries
      'framer-motion': resolve(__dirname, './src/shims/framer-motion.tsx'),
      'lucide-react': resolve(__dirname, './src/shims/lucide-react.tsx'),
      canvas: resolve(__dirname, './stubs/canvas-stub/index.js'),
      bufferutil: resolve(__dirname, './stubs/bufferutil-stub/index.js'),
      'utf-8-validate': resolve(__dirname, './stubs/utf-8-validate-stub/index.js'),
      './xhr-sync-worker.js': resolve(__dirname, './stubs/xhr-sync-worker.js'),
      // Tauri neutralization: point to browser-safe shim to prevent native API usage
      '@tauri-apps/api/core': resolve(__dirname, './src/shims/tauri.ts'),
      '@tauri-apps/api/event': resolve(__dirname, './src/shims/tauri.ts'),
      '@tauri-apps/api/updater': resolve(__dirname, './src/shims/tauri.ts'), // Optional updater plugin
      '@tauri-apps/api': resolve(__dirname, './src/shims/tauri.ts'),
    },
  },
  root: resolve(__dirname),
  publicDir: 'public',
  esbuild: {
    target: 'es2020', // Helps with JSX parsing
    jsx: 'automatic',
  },
  build: {
    outDir: 'dist-web',
    sourcemap: process.env.NODE_ENV === 'development', // Only sourcemaps in dev
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false, // Use terser in prod for better minification
    chunkSizeWarningLimit: 500, // Updated: Balanced for UI improvements (500KB chunks)
    // NETWORK FIX: Enable compression (brotli/gzip handled by server)
    reportCompressedSize: true,
    // DAY 6: Enhanced build optimization
    target: 'esnext',
    cssCodeSplit: true,
    terserOptions:
      process.env.NODE_ENV === 'production'
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
              passes: 2,
            },
            format: {
              comments: false,
            },
          }
        : undefined,
    rollupOptions: {
      external: [
        'apps/desktop',
        '@ghostery/adblocker-electron',
        '@cliqz/adblocker-electron',
        'chromium-bidi/lib/cjs/bidiMapper/BidiMapper',
        'chromium-bidi/lib/cjs/cdp/CdpConnection',
        '@tauri-apps/api',
        '@tauri-apps/api/core',
        '@tauri-apps/api/event',
        '@sentry/electron/renderer', // Optional dependency - external to prevent build-time resolution
        'jsdom',
        'cssstyle',
      ],
      output: {
        // Optimize chunk names for better caching
        chunkFileNames: 'chunks/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Optimize chunk splitting for better loading performance
        manualChunks: id => {
          // DAY 5: Enhanced chunk splitting for mobile optimization
          // Split node_modules into separate chunks
          if (id.includes('node_modules')) {
            // Large UI libraries - split into separate chunks
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('@dnd-kit')) {
              return 'vendor-dnd';
            }
                  // framer-motion chunking preserved
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
            if (id.includes('react') && !id.includes('react-dom') && !id.includes('react-router')) {
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
            // Tailwind CSS utilities
            if (id.includes('tailwindcss') || id.includes('autoprefixer')) {
              return 'vendor-styles';
            }
            // i18n libraries
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            // Other large vendors
            if (id.includes('date-fns') || id.includes('lodash') || id.includes('lunr')) {
              return 'vendor-utils';
            }
            // Everything else from node_modules
            return 'vendor';
          }
          // DAY 5: Mobile components in separate chunk
          if (id.includes('src/mobile')) {
            return 'mobile-components';
          }
          // Split mode components (already handled by lazy loading, but ensure they're in separate chunks)
          if (id.includes('/modes/')) {
            const modeMatch = id.match(/\/modes\/([^/]+)/);
            if (modeMatch) {
              return `mode-${modeMatch[1]}`;
            }
          }
          // Split route components
          if (id.includes('/routes/')) {
            const routeMatch = id.match(/\/routes\/([^/]+)/);
            if (routeMatch) {
              return `route-${routeMatch[1]}`;
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
          // Split browser components
          if (id.includes('/components/browser/')) {
            return 'components-browser';
          }
          // Split agent components
          if (id.includes('/components/agents/')) {
            return 'components-agents';
          }
        },
      },
    },
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || '5173', 10),
    strictPort: false, // Allow port override from env
    host: true,
    // Fix 431 error: Increase max header size significantly
    maxHeaderSize: 131072, // 128KB (doubled from 64KB)
    // Enable HMR with optimized configuration to fix 431 errors
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      // Use VITE_HMR_PORT to override HMR websocket port; otherwise let Vite pick an available port
      port: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT, 10) : undefined,
      clientPort: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT, 10) : undefined,
      // Disable HMR overlay temporarily to reduce header size and fix 431 errors
      overlay: false,
      // Aggressive optimizations to fix 431 errors
      timeout: 60000, // Increased timeout to reduce pressure
    },
    // Watch for file changes - use polling for better reliability on Windows
    watch: {
      usePolling: true, // Force polling for better file change detection
      interval: 500, // Increased polling interval to reduce overhead (from 300ms)
      // Additional ignored patterns to reduce watch overhead and fix 431 errors
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/dist-web/**',
        '**/*.log',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/.cache/**',
      ],
    },
    // Additional server optimizations for 431 errors
    fs: {
      strict: false, // Allow serving files outside root
      allow: ['..'], // Allow serving files from parent directories
    },
    // Headers: relaxed for development, strict for production
    headers: {
      'access-control-allow-origin': '*',
      'Content-Security-Policy':
        process.env.NODE_ENV === 'production'
          ? "default-src 'self' https:; " +
            "script-src 'self' https:; " +
            "connect-src 'self' https:; " +
            "img-src 'self' data: https:; " +
            "style-src 'self' https:; " +
            "font-src 'self' https:; " +
            "frame-src 'self' https:; " +
            'media-src https:;'
          : "default-src 'self' https: data: blob:; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
            "connect-src 'self' http://127.0.0.1:4000 http://localhost:4000 http://127.0.0.1:7700 http://localhost:7700 ws://127.0.0.1:4000 ws://localhost:4000 wss://127.0.0.1:4000 wss://localhost:4000 https://www.youtube.com https://www.youtube-nocookie.com https:; " +
            "img-src 'self' data: https:; " +
            "style-src 'self' 'unsafe-inline' https://rsms.me https:; " +
            "style-src-elem 'self' 'unsafe-inline' https://rsms.me https:; " +
            "font-src 'self' https://rsms.me https:; " +
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https:; " +
            'media-src https;'
    },
  },
  define: {
    // Ensure process.env is available for compatibility
    'process.env': {},
    // Enable HMR in development
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  // Clear screen on restart
  clearScreen: false,
  // Log level
  logLevel: 'info',
});
