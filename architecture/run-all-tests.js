#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all tests: TypeScript, unit tests, linting, integration, and verification
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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

async function runCommand(name, command, args = [], options = {}) {
  return new Promise(resolve => {
    log(`\n🧪 Running: ${name}...`, 'blue');
    log(`   Command: ${command} ${args.join(' ')}`, 'cyan');

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', code => {
      if (code === 0) {
        log(`   ✅ ${name} passed`, 'green');
        testResults.passed.push(name);
        resolve(true);
      } else {
        log(`   ❌ ${name} failed (exit code: ${code})`, 'red');
        testResults.failed.push(name);
        resolve(false);
      }
    });

    child.on('error', error => {
      log(`   ⚠ ${name} error: ${error.message}`, 'yellow');
      testResults.warnings.push(name);
      resolve(false);
    });
  });
}

async function runAllTests() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🧪 Running All Tests', 'blue');
  log('='.repeat(70), 'cyan');

  const tests = [
    {
      name: 'TypeScript Compilation',
      command: 'npm',
      args: ['run', 'build:types'],
    },
    {
      name: 'Linting',
      command: 'npm',
      args: ['run', 'lint'],
      optional: true, // Don't fail if linting has warnings
    },
    {
      name: 'Unit Tests',
      command: 'npm',
      args: ['run', 'test:unit'],
      optional: true,
    },
    {
      name: 'Integration Verification',
      command: 'node',
      args: [path.join(__dirname, 'verify-integration.js')],
    },
    {
      name: 'Service Health Check',
      command: 'node',
      args: [path.join(__dirname, 'monitoring', 'health-check.js')],
      optional: true,
    },
  ];

  for (const test of tests) {
    const success = await runCommand(test.name, test.command, test.args);
    if (!success && !test.optional) {
      log(`\n⚠ Critical test failed: ${test.name}`, 'yellow');
    }
  }

  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 Test Summary', 'blue');
  log('='.repeat(70), 'cyan');
  log(`  ✅ Passed: ${testResults.passed.length}`, 'green');
  testResults.passed.forEach(test => log(`     - ${test}`, 'green'));

  if (testResults.warnings.length > 0) {
    log(`\n  ⚠ Warnings: ${testResults.warnings.length}`, 'yellow');
    testResults.warnings.forEach(test => log(`     - ${test}`, 'yellow'));
  }

  if (testResults.failed.length > 0) {
    log(`\n  ❌ Failed: ${testResults.failed.length}`, 'red');
    testResults.failed.forEach(test => log(`     - ${test}`, 'red'));
  }

  log('');

  const allCriticalPassed = testResults.failed.length === 0;
  if (allCriticalPassed) {
    log('✅ All critical tests passed!', 'green');
    log('\n💡 Optional tests may have warnings, but core functionality is verified.', 'yellow');
    return 0;
  } else {
    log('⚠ Some tests failed. Review output above.', 'yellow');
    return 1;
  }
}

if (require.main === module) {
  runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      log(`\n❌ Test runner error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { runAllTests };
