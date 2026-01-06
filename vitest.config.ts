import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    setupFiles: ['./vitest.setup.ts', './tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'dist-web',
      '.next',
      'coverage',
      '**/node_modules/**',
      'tests/**',
      'playwright-report/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.stories.{ts,tsx}',
        'dist/',
        'dist-web/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tauri-apps/api': resolve(__dirname, './src/test-stubs/tauri-api.js'),
      '@tauri-apps/api/core': resolve(__dirname, './src/test-stubs/tauri-api-core.js'),
      'hnswlib-wasm': resolve(__dirname, './src/test-stubs/hnswlib-wasm.js'),
      '@components': resolve(__dirname, './src/components'),
      '@lib': resolve(__dirname, './src/lib'),
      '@state': resolve(__dirname, './src/state'),
      '@modes': resolve(__dirname, './src/modes'),
      react: resolve(__dirname, './node_modules/react'),
      'react-dom': resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': resolve(__dirname, './node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': resolve(__dirname, './node_modules/react/jsx-dev-runtime.js'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
