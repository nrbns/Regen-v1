/**
 * Vite Config for Redix Universal Build
 * 
 * Creates an ultra-lightweight build (< 12KB) for universal device compatibility.
 * - Vanilla JS (no React)
 * - ES2015 target (works on 99% of devices)
 * - Single bundle (no code splitting)
 * - Minimal dependencies
 * - Design tokens only
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
// import { readFileSync } from 'fs'; // Unused for now

export default defineConfig({
  root: resolve(__dirname),
  publicDir: 'public',
  
  build: {
    outDir: 'dist-redix',
    emptyOutDir: true,
    minify: 'terser',
    target: 'es2015', // Support older devices (ES6)
    sourcemap: false, // No sourcemaps for smaller size
    
    rollupOptions: {
      input: resolve(__dirname, 'src/redix/index.html'),
      output: {
        format: 'es', // ES modules for better tree-shaking
        entryFileNames: 'redix.js',
        chunkFileNames: 'redix-[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.html') {
            return 'index.html';
          }
          return 'redix-[name].[ext]';
        },
        // Single bundle, no code splitting
        manualChunks: undefined,
      },
      // Externalize heavy dependencies (use CDN or exclude)
      external: [
        'react',
        'react-dom',
        'electron',
        '@langchain/core',
        '@langchain/openai',
        '@langchain/anthropic',
      ],
    },
    
    // Aggressive minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        toplevel: true,
      },
    },
    
    // Chunk size warning (we want small bundles)
    chunkSizeWarningLimit: 12, // 12KB target
  },
  
  esbuild: {
    target: 'es2015',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    exclude: [
      'react',
      'react-dom',
      'electron',
      '@langchain/core',
      '@langchain/openai',
      '@langchain/anthropic',
    ],
  },
  
  // Server config for dev
  server: {
    port: 5174, // Different port from main app
    strictPort: true,
    host: true,
  },
});

