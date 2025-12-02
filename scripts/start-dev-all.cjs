/* eslint-env node */

const { spawn } = require('node:child_process');
const process = require('node:process');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { URL } = require('node:url');

const processes = [];
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function spawnCommand(name, cmd, args, env = {}, cwd = process.cwd()) {
  const options = {
    env: { ...process.env, ...env },
    stdio: ['inherit', 'inherit', 'inherit'],
    shell: false, // Don't use shell by default (more reliable)
    cwd,
  };
  
  // Special handling for npm on Windows (needs shell)
  if (cmd === npmCmd && isWin) {
    options.shell = true;
  }
  
  // On Unix, create new process group for better cleanup
  if (!isWin) {
    options.detached = false;
  }
  
  const child = spawn(cmd, args, options);
  
  // Store process info for cleanup
  child.processName = name;
  child.spawnTime = Date.now();
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    if (code !== 0) {
      if (CRITICAL_PROCESSES.has(name)) {
        console.error(`[${name}] Critical process exited with code ${code}, shutting down...`);
        shutdown();
      } else {
        console.warn(`[${name}] Non-critical process exited with code ${code}, continuing...`);
      }
    }
  });
  child.on('error', (err) => {
    console.error(`[${name}] spawn error:`, err);
    if (CRITICAL_PROCESSES.has(name)) {
      console.error(`[${name}] Critical process error, shutting down...`);
      shutdown();
    } else {
      console.warn(`[${name}] Non-critical process error, continuing...`);
    }
  });
  processes.push(child);
}

const CRITICAL_PROCESSES = new Set(['renderer', 'tauri']);

function shutdown() {
  console.log('[dev] 🛑 Shutting down all processes...');
  
  // Clean up lock file
  try {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  } catch {}
  
  // Kill all tracked processes
  processes.forEach((proc) => {
    if (!proc.killed && proc.pid) {
      try {
        // On Windows, kill the entire process tree
        if (isWin) {
          const { execSync } = require('child_process');
          try {
            // Use taskkill to kill process tree
            execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
          } catch {
            // Fallback to regular kill
            proc.kill('SIGTERM');
            setTimeout(() => {
              if (!proc.killed) {
                proc.kill('SIGKILL');
              }
            }, 2000);
          }
        } else {
          // Unix: kill process group
          try {
            process.kill(-proc.pid, 'SIGTERM');
            setTimeout(() => {
              try {
                process.kill(-proc.pid, 'SIGKILL');
              } catch {}
            }, 2000);
          } catch {
            proc.kill('SIGTERM');
            setTimeout(() => {
              if (!proc.killed) {
                proc.kill('SIGKILL');
              }
            }, 2000);
          }
        }
      } catch (err) {
        console.warn(`[dev] Failed to kill process ${proc.pid}:`, err);
      }
    }
  });
  
  // Also kill any remaining node processes related to this project
  setTimeout(() => {
    if (isWin) {
      try {
        const { execSync } = require('child_process');
        // Kill vite processes
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *vite*" 2>NUL', { stdio: 'ignore' });
        // Kill any node processes with our project path
        const projectPath = process.cwd().replace(/\\/g, '\\\\');
        execSync(`wmic process where "commandline like '%${projectPath}%' and name='node.exe'" delete 2>NUL`, { stdio: 'ignore' });
      } catch {}
    } else {
      try {
        // Kill processes by project path
        const projectPath = process.cwd();
        require('child_process').execSync(`pkill -f "${projectPath}" || true`, { stdio: 'ignore' });
      } catch {}
    }
  }, 1000);
  
  setTimeout(() => {
    process.exit(0);
  }, 500);
}

// Enhanced signal handlers
process.on('SIGINT', () => {
  console.log('[dev] Received SIGINT, shutting down...');
  shutdown();
});

process.on('SIGTERM', () => {
  console.log('[dev] Received SIGTERM, shutting down...');
  shutdown();
});

// Handle Windows process termination
if (isWin) {
  process.on('SIGBREAK', () => {
    console.log('[dev] Received SIGBREAK, shutting down...');
    shutdown();
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[dev] Uncaught exception:', err);
  shutdown();
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('[dev] Unhandled rejection:', reason);
  // Don't shutdown on unhandled rejection, just log
});

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
const disableRedis = process.env.DISABLE_REDIS === '1';
const IS_DEV = process.env.NODE_ENV !== 'production';
console.log(`[dev] ✅ Starting integrated development environment...`);
if (disableRedis) {
  console.log('[dev] Redis features disabled (DISABLE_REDIS=1)');
} else {
  console.log(
    `[dev] Redis URL: ${redisUrl} (optional - will gracefully degrade if unavailable)`
  );
}

// Use process.execPath to get the current node executable (more reliable on Windows)
const nodeExe = process.execPath;

// Start Redix server and worker unless disabled
function checkRedisAvailability(url) {
  return new Promise(resolve => {
    try {
      const parsed = new URL(url);
      const port = Number(parsed.port) || 6379;
      const socket = net.createConnection(
        { host: parsed.hostname, port },
        () => {
          socket.destroy();
          resolve(true);
        }
      );
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

function startRenderer() {
  setTimeout(() => {
    spawnCommand('renderer', npmCmd, ['run', 'dev:web'], {});
  }, 500);
}

function checkDevServerReady(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, { timeout: 1000 }, (res) => {
        if (res.statusCode === 200) {
          console.log('[dev] ✅ Dev server is ready');
          resolve(true);
        } else {
          if (attempts >= maxAttempts) {
            reject(new Error(`Dev server not ready after ${maxAttempts} attempts`));
          } else {
            setTimeout(check, interval);
          }
        }
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Dev server not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
      req.on('timeout', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          reject(new Error(`Dev server not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

async function startTauri() {
  const tauriDir = path.resolve('tauri-migration');
  if (!fs.existsSync(tauriDir)) {
    console.warn('[dev] Tauri workspace not found at tauri-migration, skipping desktop shell.');
    return;
  }
  // Wait for the main dev server to be ready before starting Tauri
  console.log('[dev] ⏳ Waiting for dev server to be ready...');
  try {
    await checkDevServerReady('http://localhost:5173');
    console.log('[dev] 🚀 Starting Tauri...');
    spawnCommand('tauri', npmCmd, ['run', 'tauri:dev'], {}, tauriDir);
  } catch (error) {
    console.warn('[dev] ⚠️  Dev server check failed, starting Tauri anyway:', error.message);
    spawnCommand('tauri', npmCmd, ['run', 'tauri:dev'], {}, tauriDir);
  }
}

async function bootstrap() {
  let redisEnabled = !disableRedis;
  if (redisEnabled) {
    const available = await checkRedisAvailability(redisUrl);
    if (!available) {
      console.warn(
        `[dev] Redis not reachable at ${redisUrl}. Skipping Redix services (set DISABLE_REDIS=1 to hide this message).`
      );
      redisEnabled = false;
    }
  }

  // Always start real server (works with or without Redis)
  setTimeout(() => {
    spawnCommand('redix-server', nodeExe, [path.resolve('server/redix-server.js')], {
      REDIS_URL: redisUrl,
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
  }, 100);

  // Start LLM worker for real-time processing
  setTimeout(() => {
    spawnCommand('llm-worker', nodeExe, [path.resolve('server/services/queue/llmWorker.js')], {
      REDIS_URL: redisUrl,
    });
  }, 200);

  // Start scraper worker
  setTimeout(() => {
    spawnCommand('scraper-worker', nodeExe, [path.resolve('server/services/queue/worker.js')], {
      REDIS_URL: redisUrl,
    });
  }, 300);

  if (!redisEnabled && IS_DEV) {
    console.log('[dev] ⚠️  Redis unavailable - some features may be limited (job queue, caching)');
    console.log('[dev] 💡 Install Redis for full functionality, or set DISABLE_REDIS=1 to hide this message');
  }

  startRenderer();
  startTauri();
}

bootstrap();
