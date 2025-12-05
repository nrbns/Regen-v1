#!/usr/bin/env node

/**
 * Deployment Check Script
 * 
 * Validates the project is ready for deployment by checking:
 * - Build artifacts
 * - Environment configuration
 * - Dependencies
 * - Security checks
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

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function check(name, condition, warning = false) {
  if (condition) {
    log(`✓ ${name}`, 'green');
    checks.passed++;
  } else {
    if (warning) {
      log(`⚠ ${name}`, 'yellow');
      checks.warnings++;
    } else {
      log(`✗ ${name}`, 'red');
      checks.failed++;
    }
  }
}

async function checkDeployment() {
  log('\n🚀 Running Deployment Checks...\n', 'blue');

  const rootDir = process.cwd();

  // Check build artifacts
  log('📦 Checking build artifacts...', 'yellow');
  check('dist/ directory exists', fs.existsSync(path.join(rootDir, 'dist')));
  check('dist-web/ directory exists', fs.existsSync(path.join(rootDir, 'dist-web')));

  // Check configuration files
  log('\n⚙️  Checking configuration...', 'yellow');
  check('package.json exists', fs.existsSync(path.join(rootDir, 'package.json')));
  check('.env.example exists', fs.existsSync(path.join(rootDir, '.env.example')));
  check('.env is in .gitignore', 
    fs.existsSync(path.join(rootDir, '.gitignore')) &&
    fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8').includes('.env')
  );

  // Check security
  log('\n🔒 Checking security...', 'yellow');
  const gitignore = fs.existsSync(path.join(rootDir, '.gitignore'))
    ? fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8')
    : '';
  check('.env in .gitignore', gitignore.includes('.env'));
  check('node_modules in .gitignore', gitignore.includes('node_modules'));

  // Check dependencies
  log('\n📚 Checking dependencies...', 'yellow');
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
  );
  check('package.json is valid JSON', !!packageJson);
  check('Dependencies defined', !!packageJson.dependencies || !!packageJson.devDependencies);

  // Summary
  log('\n' + '─'.repeat(50), 'cyan');
  log('📊 Summary:', 'blue');
  log(`  ✓ Passed: ${checks.passed}`, 'green');
  log(`  ⚠ Warnings: ${checks.warnings}`, 'yellow');
  log(`  ✗ Failed: ${checks.failed}`, 'red');

  if (checks.failed === 0) {
    log('\n✅ All critical checks passed! Ready for deployment.\n', 'green');
    return 0;
  } else {
    log('\n❌ Some checks failed. Please fix issues before deploying.\n', 'red');
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  checkDeployment()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      log(`\n❌ Error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { checkDeployment };

