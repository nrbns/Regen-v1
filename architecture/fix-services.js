#!/usr/bin/env node

/**
 * Fix Services Script
 * 
 * Diagnoses and fixes issues with:
 * - AI Agent UI
 * - Research functionality
 * - Backend server connectivity
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

async function checkServer(url, timeout = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve({ 
        status: res.statusCode, 
        healthy: res.statusCode < 400,
        running: true 
      });
    });

    req.on('error', () => resolve({ status: 0, healthy: false, running: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, healthy: false, running: false });
    });
  });
}

async function checkEndpoint(endpoint, method = 'GET') {
  const url = `${API_BASE_URL}${endpoint}`;
  log(`  Checking ${method} ${endpoint}...`, 'yellow');
  
  try {
    const result = await checkServer(url);
    if (result.running) {
      log(`    ✓ ${endpoint} - Status: ${result.status}`, 'green');
      return true;
    } else {
      log(`    ✗ ${endpoint} - Server not responding`, 'red');
      return false;
    }
  } catch (error) {
    log(`    ✗ ${endpoint} - Error: ${error.message}`, 'red');
    return false;
  }
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    log('⚠ .env file not found', 'yellow');
    if (fs.existsSync(envExamplePath)) {
      log('  Copying .env.example to .env...', 'yellow');
      fs.copyFileSync(envExamplePath, envPath);
      log('  ✓ Created .env file', 'green');
      return true;
    } else {
      log('  ✗ .env.example not found either', 'red');
      return false;
    }
  }
  log('✓ .env file exists', 'green');
  return true;
}

function checkPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    log('✗ package.json not found', 'red');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const hasServerScript = packageJson.scripts && (
    packageJson.scripts['dev:server'] || 
    packageJson.scripts['dev:all']
  );
  
  if (!hasServerScript) {
    log('⚠ No server start script found in package.json', 'yellow');
    return false;
  }
  
  log('✓ package.json has server scripts', 'green');
  return true;
}

async function startServer() {
  return new Promise((resolve, reject) => {
    log('\n🚀 Starting server...', 'blue');
    
    const serverProcess = spawn('npm', ['run', 'dev:server'], {
      stdio: 'inherit',
      shell: true,
      detached: false,
    });

    // Wait a bit for server to start
    setTimeout(async () => {
      const check = await checkServer(`${API_BASE_URL}/api/ping`);
      if (check.running) {
        log('✓ Server started successfully', 'green');
        resolve(serverProcess);
      } else {
        log('⚠ Server may still be starting...', 'yellow');
        resolve(serverProcess);
      }
    }, 5000);

    serverProcess.on('error', (error) => {
      log(`✗ Failed to start server: ${error.message}`, 'red');
      reject(error);
    });
  });
}

async function diagnoseAndFix() {
  log('\n🔍 Diagnosing Service Issues...\n', 'blue');
  log('='.repeat(60), 'cyan');

  // Check 1: Environment file
  log('\n📄 Checking environment configuration...', 'yellow');
  checkEnvFile();

  // Check 2: Package.json
  log('\n📦 Checking package.json...', 'yellow');
  checkPackageJson();

  // Check 3: Server status
  log(`\n🌐 Checking server at ${API_BASE_URL}...`, 'yellow');
  const serverCheck = await checkServer(`${API_BASE_URL}/api/ping`);
  
  if (!serverCheck.running) {
    log('✗ Server is not running', 'red');
    log('\n💡 Attempting to start server...', 'blue');
    
    try {
      await startServer();
      log('\n⏳ Waiting for server to be ready...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      log(`\n❌ Could not start server automatically: ${error.message}`, 'red');
      log('\n📝 Please start the server manually:', 'yellow');
      log('   npm run dev:server', 'cyan');
      log('   or', 'cyan');
      log('   npm run dev:all', 'cyan');
      return false;
    }
  } else {
    log('✓ Server is running', 'green');
  }

  // Check 4: API Endpoints
  log('\n🔌 Checking API endpoints...', 'yellow');
  const endpoints = [
    '/api/ping',
    '/api/research/run',
    '/api/agent/query',
    '/api/agent/ask',
  ];

  let allEndpointsOk = true;
  for (const endpoint of endpoints) {
    const ok = await checkEndpoint(endpoint);
    if (!ok) allEndpointsOk = false;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Diagnosis Summary:', 'blue');
  
  if (serverCheck.running && allEndpointsOk) {
    log('✅ All services are operational!', 'green');
    log('\n💡 If issues persist:', 'yellow');
    log('   1. Check browser console for errors', 'cyan');
    log('   2. Verify VITE_API_BASE_URL in .env matches server port', 'cyan');
    log('   3. Clear browser cache and reload', 'cyan');
    return true;
  } else {
    log('⚠ Some issues detected', 'yellow');
    log('\n🔧 Recommended fixes:', 'yellow');
    log('   1. Ensure server is running: npm run dev:server', 'cyan');
    log('   2. Check .env file has correct VITE_API_BASE_URL', 'cyan');
    log('   3. Verify port 4000 is not in use by another process', 'cyan');
    log('   4. Check server logs for errors', 'cyan');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  diagnoseAndFix()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`\n❌ Error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { diagnoseAndFix };

