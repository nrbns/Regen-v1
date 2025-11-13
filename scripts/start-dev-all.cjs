/* eslint-env node */

import { spawn } from 'node:child_process';
import process from 'node:process';

const processes = [];
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

function spawnCommand(name, cmd, args, env) {
  const child = spawn(cmd, args, {
    env: { ...process.env, ...env },
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    if (code !== 0) {
      shutdown();
    }
  });
  processes.push(child);
}

function shutdown() {
  processes.forEach((proc) => {
    if (!proc.killed) {
      proc.kill();
    }
  });
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
console.log(`[dev:all] using Redis at ${redisUrl}`);

spawnCommand('redix-server', 'node', ['server/redix-server.js'], { REDIS_URL: redisUrl });
spawnCommand('redix-worker', 'node', ['server/redix-worker.js'], { REDIS_URL: redisUrl });
spawnCommand('renderer', npmCmd, ['run', 'dev'], {});


