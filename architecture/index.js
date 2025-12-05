#!/usr/bin/env node

/**
 * Architecture Scripts Entry Point
 * 
 * Main entry point for running architecture-related scripts
 */

const { spawn } = require('child_process');
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

const scripts = {
  init: path.join(__dirname, 'setup', 'init-architecture.js'),
  analyze: path.join(__dirname, 'analysis', 'analyze-structure.js'),
  'deploy-check': path.join(__dirname, 'deployment', 'deploy-check.js'),
  'health-check': path.join(__dirname, 'monitoring', 'health-check.js'),
  fix: path.join(__dirname, 'fix-services.js'),
  verify: path.join(__dirname, 'verify-integration.js'),
};

function showHelp() {
  log('\n🏗️  Architecture Scripts\n', 'blue');
  log('Usage: node architecture/index.js <command>\n', 'cyan');
  log('Available commands:', 'yellow');
  Object.keys(scripts).forEach(cmd => {
    log(`  ${cmd.padEnd(15)} - Run ${scripts[cmd].split('/').pop()}`, 'green');
  });
  log('\nExamples:', 'yellow');
  log('  node architecture/index.js init', 'cyan');
  log('  node architecture/index.js analyze', 'cyan');
  log('  node architecture/index.js deploy-check', 'cyan');
  log('  node architecture/index.js health-check', 'cyan');
  log('');
}

function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  const scriptPath = scripts[command];

  if (!scriptPath) {
    log(`\n❌ Unknown command: ${command}`, 'red');
    showHelp();
    process.exit(1);
  }

  try {
    await runScript(scriptPath);
  } catch (error) {
    log(`\n❌ Error running script: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { scripts, runScript };

