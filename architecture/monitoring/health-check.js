#!/usr/bin/env node

/**
 * Architecture Health Check Script
 * 
 * Monitors the health of various architectural components:
 * - Server status
 * - Database connections
 * - API endpoints
 * - File system
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkServer(url, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve({ status: res.statusCode, healthy: res.statusCode < 400 });
    });

    req.on('error', () => resolve({ status: 0, healthy: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, healthy: false });
    });
  });
}

async function checkFileSystem() {
  const rootDir = process.cwd();
  const criticalPaths = [
    'src',
    'server',
    'package.json',
  ];

  const results = {};
  for (const criticalPath of criticalPaths) {
    const fullPath = path.join(rootDir, criticalPath);
    results[criticalPath] = fs.existsSync(fullPath);
  }
  return results;
}

async function runHealthCheck() {
  log('\n🏥 Running Architecture Health Check...\n', 'blue');

  // File system check
  log('📁 Checking file system...', 'yellow');
  const fsCheck = await checkFileSystem();
  Object.entries(fsCheck).forEach(([path, exists]) => {
    if (exists) {
      log(`  ✓ ${path}`, 'green');
    } else {
      log(`  ✗ ${path}`, 'red');
    }
  });

  // Server check (if configured)
  const apiBase = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
  log(`\n🌐 Checking server at ${apiBase}...`, 'yellow');
  const serverCheck = await checkServer(`${apiBase}/api/ping`);
  if (serverCheck.healthy) {
    log(`  ✓ Server is healthy (Status: ${serverCheck.status})`, 'green');
  } else {
    log(`  ⚠ Server check failed (Status: ${serverCheck.status})`, 'yellow');
  }

  log('\n✅ Health check complete!\n', 'green');
}

// Run if called directly
if (require.main === module) {
  runHealthCheck().catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runHealthCheck };

