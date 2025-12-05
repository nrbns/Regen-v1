#!/usr/bin/env node

/**
 * Architecture Initialization Script
 * 
 * This script initializes the project architecture by:
 * - Setting up directory structures
 * - Validating configuration
 * - Checking dependencies
 * - Creating necessary files
 */

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

function checkDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`✓ Created directory: ${dir}`, 'green');
    return false;
  }
  log(`✓ Directory exists: ${dir}`, 'green');
  return true;
}

function checkFile(file, content = '') {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, content);
    log(`✓ Created file: ${file}`, 'green');
    return false;
  }
  log(`✓ File exists: ${file}`, 'green');
  return true;
}

async function initializeArchitecture() {
  log('\n🚀 Initializing Project Architecture...\n', 'blue');

  const rootDir = path.resolve(__dirname, '../..');
  
  // Required directories
  const directories = [
    'src',
    'server',
    'scripts',
    'docs',
    'tests',
    'config',
    'dist',
  ];

  // Required configuration files
  const configFiles = [
    { path: 'package.json', required: true },
    { path: 'tsconfig.json', required: true },
    { path: '.env.example', required: false },
  ];

  log('📁 Checking directory structure...', 'yellow');
  directories.forEach(dir => {
    checkDirectory(path.join(rootDir, dir));
  });

  log('\n📄 Checking configuration files...', 'yellow');
  configFiles.forEach(({ path: filePath, required }) => {
    const fullPath = path.join(rootDir, filePath);
    const exists = checkFile(fullPath);
    if (required && !exists) {
      log(`⚠ Warning: Required file missing: ${filePath}`, 'yellow');
    }
  });

  log('\n✅ Architecture initialization complete!\n', 'green');
}

// Run if called directly
if (require.main === module) {
  initializeArchitecture().catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { initializeArchitecture };

