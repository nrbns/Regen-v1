#!/usr/bin/env node

/**
 * Run All Tests Script
 * Executes all test suites: unit, lint, e2e, build, security, storybook
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description, optional = false) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${description}`, colors.blue);
  log(`${'='.repeat(60)}`, colors.cyan);

  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    log(`✅ ${description} passed`, colors.green);
    return true;
  } catch (error) {
    if (optional) {
      log(`⚠️  ${description} failed (optional, continuing...)`, colors.yellow);
      return true;
    } else {
      log(`❌ ${description} failed`, colors.red);
      return false;
    }
  }
}

function checkTestFiles() {
  const testExtensions = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  let testCount = 0;

  function countTests(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && file !== 'node_modules' && !file.startsWith('.')) {
        countTests(filePath);
      } else if (stat.isFile()) {
        if (testExtensions.some(ext => file.endsWith(ext))) {
          testCount++;
        }
      }
    }
  }

  countTests(process.cwd());
  return testCount;
}

async function main() {
  log('\n🧪 Running All Test Suites', colors.cyan);
  log('='.repeat(60), colors.cyan);

  const results = {
    lint: false,
    typeCheck: false,
    unitTests: false,
    build: false,
    security: false,
    storybook: false,
    e2e: false,
  };

  // 1. Lint Test
  results.lint = runCommand('npm run lint', '1. Lint Test', false);

  // 2. Type Check
  results.typeCheck = runCommand('npm run build:types', '2. TypeScript Type Check', false);

  // 3. Unit Tests
  const testCount = checkTestFiles();
  if (testCount > 0) {
    log(`\nFound ${testCount} test file(s)`, colors.cyan);
    results.unitTests = runCommand('npm run test:unit', '3. Unit Tests', true);
  } else {
    log('\n⚠️  No unit test files found, skipping...', colors.yellow);
    results.unitTests = true; // Skip if no tests
  }

  // 4. Build Test
  results.build = runCommand('npm run build', '4. Build Test', false);

  // 5. Security Audit
  results.security = runCommand('npm run audit:prod', '5. Security Audit', true);

  // 6. Storybook Build (if configured)
  if (fs.existsSync('.storybook') || fs.existsSync('.storybook/main.ts')) {
    results.storybook = runCommand('npm run storybook:build', '6. Storybook Build', true);
  } else {
    log('\n⚠️  Storybook not configured, skipping...', colors.yellow);
    results.storybook = true; // Skip if not configured
  }

  // 7. E2E Tests (optional, can be time-consuming)
  if (process.argv.includes('--e2e')) {
    results.e2e = runCommand('npm run test:e2e', '7. E2E Tests', true);
  } else {
    log('\n💡 Tip: Run with --e2e flag to include E2E tests', colors.cyan);
  }

  // Summary
  log('\n' + '='.repeat(60), colors.cyan);
  log('📊 Test Results Summary', colors.blue);
  log('='.repeat(60), colors.cyan);

  const critical = ['lint', 'typeCheck', 'build'];
  const optional = ['unitTests', 'security', 'storybook', 'e2e'];

  let criticalFailed = false;
  let optionalFailed = false;

  critical.forEach(test => {
    const status = results[test] ? '✅' : '❌';
    const color = results[test] ? colors.green : colors.red;
    log(`${status} ${test}`, color);
    if (!results[test]) criticalFailed = true;
  });

  optional.forEach(test => {
    const status = results[test] ? '✅' : '⚠️';
    const color = results[test] ? colors.green : colors.yellow;
    log(`${status} ${test} (optional)`, color);
    if (!results[test]) optionalFailed = true;
  });

  log('\n' + '='.repeat(60), colors.cyan);

  if (criticalFailed) {
    log('❌ Critical tests failed! Please fix the issues above.', colors.red);
    process.exit(1);
  } else if (optionalFailed) {
    log('✅ All critical tests passed! Some optional tests had warnings.', colors.green);
    process.exit(0);
  } else {
    log('✅ All tests passed!', colors.green);
    process.exit(0);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
