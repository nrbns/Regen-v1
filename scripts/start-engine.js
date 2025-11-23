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

const engine = spawn('npx', ['tsx', 'watch', engineScript], {
  cwd: enginePath,
  stdio: 'inherit',
  shell: true,
});

engine.on('error', error => {
  console.error('[Engine] Failed to start:', error);
  process.exit(1);
});

engine.on('exit', code => {
  console.log(`[Engine] Process exited with code ${code}`);
  process.exit(code || 0);
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
