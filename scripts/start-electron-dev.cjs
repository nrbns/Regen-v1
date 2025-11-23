const { spawn } = require('node:child_process');
const waitOn = require('wait-on');
const path = require('node:path');
const fs = require('node:fs');
const electronPath = require('electron');

async function main() {
  // Check if Electron is already running by checking for lock file
  const lockFilePath = path.join(process.cwd(), '.electron-dev.lock');
  
  // Check if lock file exists and if the process is still running
  if (fs.existsSync(lockFilePath)) {
    try {
      const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
      const lockPid = lockData.pid;
      
      // Check if process is still running (Windows-compatible)
      try {
        // Try to send signal 0 to check if process exists
        if (process.platform === 'win32') {
          // On Windows, check if process exists differently
          const { execSync } = require('child_process');
          try {
            execSync(`tasklist /FI "PID eq ${lockPid}" 2>NUL | find /I "${lockPid}" >NUL`);
            // Process exists - another instance is running
            console.error('[electron-dev] Another Electron instance is already running!');
            console.error('[electron-dev] PID:', lockPid);
            console.error('[electron-dev] Please close the existing instance before starting a new one.');
            process.exit(1);
          } catch {
            // Process doesn't exist - stale lock file, remove it
            fs.unlinkSync(lockFilePath);
          }
        } else {
          // Unix-like systems
          process.kill(lockPid, 0); // Signal 0 just checks if process exists
          // Process exists - another instance is running
          console.error('[electron-dev] Another Electron instance is already running!');
          console.error('[electron-dev] PID:', lockPid);
          console.error('[electron-dev] Please close the existing instance before starting a new one.');
          process.exit(1);
        }
      } catch {
        // Process doesn't exist - stale lock file, remove it
        fs.unlinkSync(lockFilePath);
      }
    } catch {
      // Invalid lock file, remove it
      fs.unlinkSync(lockFilePath);
    }
  }
  
  // Create lock file
  try {
    fs.writeFileSync(lockFilePath, JSON.stringify({ pid: process.pid, timestamp: Date.now() }));
  } catch (error) {
    console.warn('[electron-dev] Failed to create lock file:', error);
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
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  
  process.env.NODE_ENV = 'development';
  if (!process.env.VITE_DEV_SERVER_URL) {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
  }
  if (!process.env.OB_DISABLE_HEAVY_SERVICES) {
    process.env.OB_DISABLE_HEAVY_SERVICES = '1';
  }
  process.env.ELECTRON_DISABLE_GPU_SANDBOX = process.env.ELECTRON_DISABLE_GPU_SANDBOX || '1';
  process.env.LIBANGLE_DISABLE_D3D11 = process.env.LIBANGLE_DISABLE_D3D11 || '1';
  process.env.ANGLE_DEFAULT_PLATFORM = process.env.ANGLE_DEFAULT_PLATFORM || 'swiftshader';
  process.env.ELECTRON_FORCE_USE_SWIFTSHADER = process.env.ELECTRON_FORCE_USE_SWIFTSHADER || '1';
  process.env.GPU_MEMORY_BUFFER_COMPOSITOR_RESOURCES = process.env.GPU_MEMORY_BUFFER_COMPOSITOR_RESOURCES || '0';

  console.log('[electron-dev] OB_DISABLE_HEAVY_SERVICES=', process.env.OB_DISABLE_HEAVY_SERVICES);

  const distDir = path.resolve(process.cwd(), 'dist-electron');
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('[electron-dev] Failed to clear dist-electron before rebuild:', error);
  }

  await waitOn({
    resources: [
      'tcp:5173',
      'file:dist-electron/index.js',
      'file:dist-electron/main.js',
    ],
    timeout: 45000,
  });

  const child = spawn(
    electronPath,
    ['--inspect=9229', '--trace-warnings', '--enable-logging', '--v=1', '.'],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  child.on('exit', (code, signal) => {
    console.error(`[electron-dev] Electron exited with code ${code} signal ${signal ?? 'none'}`);
    cleanup(); // Clean up lock file
    process.exit(code ?? 1);
  });
  
  child.on('error', (error) => {
    console.error('[electron-dev] Failed to start Electron:', error);
    cleanup(); // Clean up lock file
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('[electron-dev] Failed to start Electron:', error);
  process.exit(1);
});
