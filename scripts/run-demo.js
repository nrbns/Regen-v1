#!/usr/bin/env node
/**
 * PR10: Demo Script
 *
 * One-command demo that starts:
 * - Redis (if not running)
 * - Server (Fastify/Socket.IO)
 * - Worker (LLM worker)
 * - Desktop app (Vite dev server)
 *
 * Usage:
 *   node scripts/run-demo.js
 *   npm run demo
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPort(port) {
  return new Promise(resolve => {
    const net = require('net');
    const socket = new net.Socket();

    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, 'localhost');
  });
}

async function checkRedis() {
  log('Checking Redis...', 'cyan');

  const port = 6379;
  const redisRunning = await checkPort(port);

  if (redisRunning) {
    log('✅ Redis is running on port 6379', 'green');
    return true;
  }

  log('⚠️  Redis not running on port 6379', 'yellow');
  log('   Please start Redis: redis-server', 'yellow');
  log('   Or install: https://redis.io/download', 'yellow');
  return false;
}

function startProcess(name, command, args, options = {}) {
  log(`Starting ${name}...`, 'cyan');

  const proc = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  proc.on('error', error => {
    log(`❌ Failed to start ${name}: ${error.message}`, 'red');
  });

  return proc;
}

async function waitForService(name, port, timeout = 30000) {
  log(`Waiting for ${name} on port ${port}...`, 'cyan');

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const isReady = await checkPort(port);
    if (isReady) {
      log(`✅ ${name} is ready on port ${port}`, 'green');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  log(`❌ ${name} failed to start within ${timeout}ms`, 'red');
  return false;
}

async function main() {
  log('🚀 Starting Regen Browser Demo...', 'bright');
  log('', 'reset');

  // Check Redis
  const redisOk = await checkRedis();
  if (!redisOk) {
    log('', 'reset');
    log('Continuing without Redis (some features may not work)', 'yellow');
  }

  log('', 'reset');

  // Start server
  const serverProc = startProcess('Server', 'node', ['server/redix-server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: process.env.PORT || '4000',
      NODE_ENV: 'development',
    },
  });

  // Wait for server to be ready
  await waitForService('Server', 4000, 15000);

  // Start Socket.IO realtime server if exists
  if (existsSync(path.join(process.cwd(), 'server/realtime.js'))) {
    const realtimeProc = startProcess('Realtime Server', 'node', ['server/realtime.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: process.env.REALTIME_PORT || '4001',
      },
    });

    await waitForService('Realtime Server', 4001, 10000);
  }

  // Start worker
  const workerProc = startProcess('LLM Worker', 'node', ['server/services/queue/llmWorker.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  // Wait a bit for worker to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start Vite dev server (desktop app)
  const viteProc = startProcess('Desktop App (Vite)', 'npm', ['run', 'dev:web'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:4000',
      VITE_SOCKET_URL: process.env.VITE_SOCKET_URL || 'http://localhost:4001',
    },
  });

  // Wait for Vite to be ready
  await waitForService('Desktop App', 5173, 20000);

  log('', 'reset');
  log('═══════════════════════════════════════════════', 'cyan');
  log('✅ Demo is running!', 'green');
  log('', 'reset');
  log('Services:', 'bright');
  log('  • Desktop App: http://localhost:5173', 'green');
  log('  • API Server:  http://localhost:4000', 'green');
  if (existsSync(path.join(process.cwd(), 'server/realtime.js'))) {
    log('  • Realtime:    http://localhost:4001', 'green');
  }
  log('  • Worker:      Running in background', 'green');
  log('', 'reset');
  log('Press Ctrl+C to stop all services', 'yellow');
  log('═══════════════════════════════════════════════', 'cyan');
  log('', 'reset');

  // Handle shutdown
  const shutdown = () => {
    log('', 'reset');
    log('Shutting down...', 'yellow');

    serverProc.kill();
    workerProc.kill();
    viteProc.kill();

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
}

main().catch(error => {
  log(`❌ Demo failed: ${error.message}`, 'red');
  process.exit(1);
});
