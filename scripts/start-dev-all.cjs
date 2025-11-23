/* eslint-env node */

const { spawn } = require('node:child_process');
const process = require('node:process');
const path = require('node:path');

const processes = [];
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function spawnCommand(name, cmd, args, env) {
  const options = {
    env: { ...process.env, ...env },
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: false, // Don't use shell by default (more reliable)
    cwd: process.cwd(),
  };
  
  // Special handling for npm on Windows (needs shell)
  if (cmd === npmCmd && isWin) {
    options.shell = true;
  }
  
  const child = spawn(cmd, args, options);
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    // Only shutdown on critical process failures (Vite or Electron)
    // Engine and Redix are optional and can fail without crashing the app
    if (code !== 0) {
      if (name === 'renderer' || name.includes('electron')) {
        console.error(`[${name}] Critical process exited with code ${code}, shutting down...`);
        shutdown();
      } else {
        console.warn(`[${name}] Non-critical process exited with code ${code}, continuing...`);
        // Don't shutdown - allow other processes to continue
      }
    }
  });
  child.on('error', (err) => {
    console.error(`[${name}] spawn error:`, err);
    // Only shutdown on critical process errors
    if (name === 'renderer' || name.includes('electron')) {
      console.error(`[${name}] Critical process error, shutting down...`);
      shutdown();
    } else {
      console.warn(`[${name}] Non-critical process error, continuing...`);
    }
  });
  processes.push(child);
}

function shutdown() {
  // Clean up lock file
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  } catch {}
  
  processes.forEach((proc) => {
    if (!proc.killed) {
      proc.kill();
    }
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Check if another dev process is already running
const fs = require('node:fs');
const lockFilePath = path.join(process.cwd(), '.dev-all.lock');

if (fs.existsSync(lockFilePath)) {
  try {
    const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
    const lockPid = lockData.pid;
    
    // Check if process is still running
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        execSync(`tasklist /FI "PID eq ${lockPid}" 2>NUL | find /I "${lockPid}" >NUL`);
        console.error('[dev] ❌ Another dev process is already running!');
        console.error('[dev] PID:', lockPid);
        console.error('[dev] Please close the existing dev process before starting a new one.');
        process.exit(1);
      } catch {
        // Process doesn't exist - stale lock file
        fs.unlinkSync(lockFilePath);
      }
    } else {
      try {
        process.kill(lockPid, 0);
        console.error('[dev] ❌ Another dev process is already running!');
        console.error('[dev] PID:', lockPid);
        console.error('[dev] Please close the existing dev process before starting a new one.');
        process.exit(1);
      } catch {
        // Process doesn't exist - stale lock file
        fs.unlinkSync(lockFilePath);
      }
    }
  } catch {
    // Invalid lock file
    fs.unlinkSync(lockFilePath);
  }
}

// Create lock file
try {
  fs.writeFileSync(lockFilePath, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
} catch (error) {
  console.warn('[dev] Failed to create lock file:', error);
}

// Clean up lock file on exit
const cleanup = () => {
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  } catch {}
};

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  shutdown();
});
process.on('SIGTERM', () => {
  cleanup();
  shutdown();
});

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log(`[dev] ✅ Starting integrated development environment...`);
console.log(`[dev] Redis URL: ${redisUrl} (optional - will gracefully degrade if unavailable)`);

// Use process.execPath to get the current node executable (more reliable on Windows)
const nodeExe = process.execPath;

// Start Redix server and worker (optional - will gracefully degrade if Redis unavailable)
// Add small delay to prevent race conditions
setTimeout(() => {
  spawnCommand('redix-server', nodeExe, [path.resolve('server/redix-server.js')], { REDIS_URL: redisUrl });
}, 100);

setTimeout(() => {
  spawnCommand('redix-worker', nodeExe, [path.resolve('server/redix-worker.js')], { REDIS_URL: redisUrl });
}, 200);

// Start main dev environment (Vite + Electron + Engine)
// This uses the basic dev script which runs vite, electron-dev, and engine
// Add delay to ensure Redix services start first
setTimeout(() => {
  spawnCommand('renderer', npmCmd, ['run', 'dev:basic'], {});
}, 500);


