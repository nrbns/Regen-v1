#!/usr/bin/env node
/**
 * Safe Server Startup Script
 * Handles errors gracefully and provides clear feedback
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Regen Backend Server...\n');

const serverPath = path.resolve(__dirname, '../server/redix-server.js');
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit',
  shell: true,
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Server exited with code ${code}`);
    console.log('\n💡 Common issues:');
    console.log('  - Port 4000 already in use (kill existing process)');
    console.log('  - Missing dependencies (run: npm install)');
    console.log('  - Syntax errors in server code');
    process.exit(code);
  }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Server process started');
console.log('📡 Server should be available at http://localhost:4000');
console.log('🛑 Press Ctrl+C to stop\n');




