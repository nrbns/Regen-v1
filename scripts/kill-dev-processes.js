#!/usr/bin/env node
/**
 * Kill all development processes (Vite, Redix, Engine, Electron)
 * Useful for cleaning up orphaned processes
 */

const { execSync } = require('child_process');
const isWin = process.platform === 'win32';

console.log('🛑 Killing all development processes...');

try {
  if (isWin) {
    // Kill by port
    const ports = [5173, 5183, 4000, 3030, 9229];
    ports.forEach(port => {
      try {
        const result = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        const lines = result.split('\n').filter(line => line.includes(`:${port}`));
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            try {
              execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
              console.log(`✅ Killed process on port ${port} (PID: ${pid})`);
            } catch {}
          }
        });
      } catch {
        // Port not in use
      }
    });

    // Kill node processes with project path
    try {
      const projectPath = process.cwd().replace(/\\/g, '\\\\');
      execSync(
        `wmic process where "commandline like '%${projectPath}%' and name='node.exe'" delete`,
        { stdio: 'ignore' }
      );
      console.log('✅ Killed node processes with project path');
    } catch {}

    // Kill electron processes
    try {
      execSync('taskkill /F /IM electron.exe 2>NUL', { stdio: 'ignore' });
      console.log('✅ Killed Electron processes');
    } catch {}
  } else {
    // Unix: Kill by port
    const ports = [5173, 5183, 4000, 3030, 9229];
    ports.forEach(port => {
      try {
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
        console.log(`✅ Killed processes on port ${port}`);
      } catch {}
    });

    // Kill processes by project path
    const projectPath = process.cwd();
    try {
      execSync(`pkill -f "${projectPath}" || true`, { stdio: 'ignore' });
      console.log('✅ Killed processes with project path');
    } catch {}

    // Kill electron processes
    try {
      execSync('pkill -f electron || true', { stdio: 'ignore' });
      console.log('✅ Killed Electron processes');
    } catch {}
  }

  console.log('✅ Cleanup complete');
} catch (error) {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
}
