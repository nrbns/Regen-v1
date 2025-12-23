#!/usr/bin/env node
/**
 * CI Validation Script
 * Simulates full CI pipeline locally before pushing
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

const steps = [
  {
    name: 'Lint & Type Check',
    command: 'npm run lint && npm run typecheck',
    critical: true,
  },
  {
    name: 'Format Check',
    command: 'npx prettier --check "**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css,scss}"',
    critical: true,
  },
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    critical: true,
  },
  {
    name: 'Build',
    command: 'npm run build',
    critical: true,
  },
  {
    name: 'Integration Tests',
    command: 'npm run test:integration',
    critical: false,
  },
  {
    name: 'E2E Tests',
    command: 'npm run test:e2e',
    critical: false,
  },
  {
    name: 'K6 Load Tests',
    command: 'npm run test:load',
    critical: true,
  },
];

console.log(chalk.bold.blue('\n🚀 Running CI Validation Pipeline\n'));
console.log(chalk.gray('This simulates the full CI pipeline locally\n'));

let passed = 0;
let failed = 0;
let skipped = 0;

for (const step of steps) {
  console.log(chalk.bold(`\n▶️  ${step.name}`));
  console.log(chalk.gray(`   Command: ${step.command}`));

  try {
    execSync(step.command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ ${step.name} passed`));
    passed++;
  } catch (error) {
    if (step.critical) {
      console.log(chalk.red(`❌ ${step.name} FAILED (CRITICAL)`));
      failed++;

      console.log(chalk.red('\n🚨 Critical step failed. Aborting pipeline.\n'));
      console.log(chalk.yellow('Fix the issues and try again.'));
      process.exit(1);
    } else {
      console.log(chalk.yellow(`⚠️  ${step.name} failed (non-critical, continuing...)`));
      skipped++;
    }
  }
}

console.log(chalk.bold.green('\n\n✅ CI Validation Complete\n'));
console.log(chalk.white('Summary:'));
console.log(chalk.green(`  ✓ Passed: ${passed}`));
if (failed > 0) {
  console.log(chalk.red(`  ✗ Failed: ${failed}`));
}
if (skipped > 0) {
  console.log(chalk.yellow(`  ⚠ Skipped: ${skipped}`));
}

if (failed === 0) {
  console.log(chalk.bold.green('\n🎉 Ready to push!'));
  process.exit(0);
} else {
  console.log(chalk.bold.red('\n🚫 Fix failures before pushing'));
  process.exit(1);
}
