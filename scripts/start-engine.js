/**
 * Start Omni Engine as separate process
 * Can be called from Electron or run standalone
 */

const { spawn } = require('child_process');
const path = require('path');

const enginePath = path.join(__dirname, '..', 'packages', 'omni-engine');
const engineScript = path.join(enginePath, 'src', 'server.ts');

console.log('[Engine] Starting Omni Engine...');
console.log('[Engine] Path:', enginePath);

// Check if engine directory exists
const fs = require('fs');
if (!fs.existsSync(enginePath)) {
  console.warn('[Engine] Engine directory not found, skipping engine startup');
  console.warn('[Engine] App will continue without engine service');
  // Don't exit - allow app to continue
  process.exit(0);
}

if (!fs.existsSync(engineScript)) {
  console.warn('[Engine] Engine server script not found, skipping engine startup');
  console.warn('[Engine] App will continue without engine service');
  process.exit(0);
}

const engine = spawn('npx', ['tsx', 'watch', engineScript], {
  cwd: enginePath,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    // Make Redis optional for engine
    REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    DISABLE_REDIS: process.env.DISABLE_REDIS || '0',
  },
});

engine.on('error', error => {
  console.error('[Engine] Failed to start:', error.message || error);
  // Don't exit - let the parent process handle it
  // This allows the app to continue even if engine fails
  if (error.code === 'ENOENT') {
    console.warn('[Engine] tsx not found. Engine will not start, but app will continue.');
    console.warn('[Engine] To enable engine: npm install -g tsx (or install in engine package)');
  }
  // Exit with 0 to prevent parent from crashing
  process.exit(0);
});

engine.on('exit', code => {
  if (code !== 0 && code !== null) {
    console.warn(
      `[Engine] Process exited with code ${code} - this is non-fatal, app will continue`
    );
    // Exit with 0 to prevent parent from crashing
    process.exit(0);
  }
  console.log(`[Engine] Process exited with code ${code}`);
  // Exit with 0 to prevent parent from crashing
  process.exit(0);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Engine] SIGTERM received, shutting down...');
  engine.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('[Engine] SIGINT received, shutting down...');
  engine.kill('SIGINT');
});
