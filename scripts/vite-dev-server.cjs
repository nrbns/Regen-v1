#!/usr/bin/env node

/**
 * Vite dev server wrapper for Tauri
 * 
 * This script starts Vite with proper configuration to handle
 * large HTTP headers from the Tauri WebView, avoiding HTTP 431 errors.
 * 
 * Usage: node scripts/vite-dev-server.cjs
 */

const http = require('http');
const net = require('net');

// Set Node.js HTTP server options for large headers
process.env.NODE_OPTIONS = '--max-http-header-size=262144'; // 256KB

// Also try to run the vite dev server with the proper configuration
const { spawn } = require('child_process');
const path = require('path');

const viteArgs = [
  'cross-env',
  'JSDOM_NO_CANVAS=1',
  'npx',
  'vite',
  '--mode',
  'development',
];

// Run vite with the environment variable set
const viteProcess = spawn('npx', ['cross-env', 'JSDOM_NO_CANVAS=1', 'vite', '--mode', 'development'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NODE_OPTIONS: '--max-http-header-size=262144',
  },
});

viteProcess.on('exit', (code) => {
  process.exit(code);
});

viteProcess.on('error', (err) => {
  console.error('Failed to start Vite dev server:', err);
  process.exit(1);
});
