#!/usr/bin/env node
// Script to start frontend dev server from project root
// This is used by Tauri's beforeDevCommand

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Get project root (this script is in scripts/, so go up one level)
const projectRoot = path.resolve(__dirname, '..');

// Check if frontend is already running
function checkFrontendRunning() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:5173', res => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  // Check if package.json exists
  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    console.error('Error: package.json not found in project root');
    process.exit(1);
  }

  // Check if frontend is already running
  const isRunning = await checkFrontendRunning();
  if (isRunning) {
    console.log('Frontend dev server is already running on port 5173');
    process.exit(0);
  }

  // Start the frontend dev server in background
  console.log('Starting frontend dev server...');
  const child = spawn('npm', ['run', 'dev:web'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    detached: true,
  });

  // Don't wait for the process - let it run in background
  child.unref();

  // Give it a moment to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if it started successfully
  const started = await checkFrontendRunning();
  if (started) {
    console.log('Frontend dev server started successfully');
    process.exit(0);
  } else {
    console.log('Frontend dev server is starting (may take a few seconds)...');
    process.exit(0); // Exit anyway - Tauri will wait for the server
  }
}

main().catch(err => {
  console.error('Failed to start frontend dev server:', err.message);
  process.exit(1);
});
