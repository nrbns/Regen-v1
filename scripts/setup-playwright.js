/**
 * Setup Playwright Chromium for bundling
 * Downloads and bundles Chromium for offline use
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🔍 Setting up Playwright Chromium for bundling...\n');

try {
  // Install Playwright if not already installed
  console.log('📦 Installing Playwright...');
  execSync('npm install --save-dev playwright', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  // Install Chromium browser
  console.log('🌐 Installing Chromium browser...');
  execSync('npx playwright install chromium --with-deps', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  // Find Chromium executable
  const playwrightPath = path.join(
    ROOT_DIR,
    'node_modules',
    '@playwright',
    'core',
    '.local-browsers'
  );

  console.log('\n✅ Playwright Chromium setup complete!');
  console.log(`📁 Chromium location: ${playwrightPath}`);
  console.log('\n💡 Chromium will be bundled with the app for offline use.');
} catch (error) {
  console.error('❌ Failed to setup Playwright:', error.message);
  console.warn('⚠️  Browser integration will use system browser as fallback');
  process.exit(1);
}
