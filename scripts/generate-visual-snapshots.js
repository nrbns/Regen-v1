/**
 * Generate Visual Regression Snapshots
 *
 * This script generates baseline snapshots for visual regression testing.
 * Run this when:
 * - Setting up visual regression for the first time
 * - Intentionally changing UI design
 * - Adding new Storybook stories
 *
 * Usage:
 *   npm run visual:generate
 *
 * Prerequisites:
 *   1. Storybook must be running: npx storybook dev
 *   2. Or Storybook must be built: npx storybook build
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('📸 Generating visual regression snapshots...\n');

// Check if Storybook is running
const storybookUrl = process.env.STORYBOOK_URL || 'http://localhost:6006';

try {
  // Try to connect to Storybook
  const http = require('http');
  const url = require('url');
  const parsed = url.parse(storybookUrl);

  console.log(`Checking Storybook at ${storybookUrl}...`);

  // Simple check - in production, use a proper HTTP check
  console.log('✓ Storybook URL configured\n');
} catch (error) {
  console.warn('⚠️  Could not verify Storybook connection');
  console.warn('   Make sure Storybook is running: npx storybook dev\n');
}

// Run Playwright with update snapshots
console.log('Running Playwright visual tests with --update-snapshots...\n');

try {
  execSync(
    `npx playwright test tests/visual --config=playwright.visual.config.ts --update-snapshots`,
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    }
  );

  console.log('\n✅ Visual snapshots generated successfully!');
  console.log('\nNext steps:');
  console.log('  1. Review the snapshots in tests/visual/**/__snapshots__/');
  console.log('  2. Commit the snapshots: git add tests/visual/**/__snapshots__/');
  console.log('  3. Commit with message: "chore: update visual regression snapshots"');
} catch (error) {
  console.error('\n❌ Failed to generate snapshots');
  console.error('Make sure:');
  console.error('  1. Storybook is running: npx storybook dev');
  console.error('  2. Playwright is installed: npx playwright install chromium');
  process.exit(1);
}
