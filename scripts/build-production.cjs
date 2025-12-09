#!/usr/bin/env node
/**
 * Production Build Script
 * Builds Tauri app with all optimizations for release
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building RegenBrowser for Production...\n');

const ROOT_DIR = path.join(__dirname, '..');
const TAURI_DIR = path.join(ROOT_DIR, 'tauri-migration');

// Step 1: Build frontend
console.log('Step 1: Building frontend...');
try {
  execSync('npm run build', { 
    cwd: ROOT_DIR, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Verify build output
console.log('Step 2: Verifying build output...');
const distPath = path.join(ROOT_DIR, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ directory not found');
  process.exit(1);
}

const indexHtml = path.join(distPath, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('❌ dist/index.html not found');
  process.exit(1);
}
console.log('✅ Build output verified\n');

// Step 3: Build Tauri app
console.log('Step 3: Building Tauri app...');
try {
  execSync('npm run tauri build', {
    cwd: TAURI_DIR,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Tauri build complete\n');
} catch (error) {
  console.error('❌ Tauri build failed:', error.message);
  console.log('\n💡 Troubleshooting:');
  console.log('   1. Ensure Rust toolchain is installed: rustup --version');
  console.log('   2. Check tauri.conf.json is valid');
  console.log('   3. Verify all dependencies are installed');
  process.exit(1);
}

// Step 4: Locate build artifacts
console.log('Step 4: Locating build artifacts...');
const tauriTarget = path.join(TAURI_DIR, 'src-tauri', 'target', 'release');
const bundles = path.join(tauriTarget, 'bundle');

if (fs.existsSync(bundles)) {
  const bundleFiles = fs.readdirSync(bundles);
  console.log('✅ Build artifacts found:');
  bundleFiles.forEach(file => {
    const filePath = path.join(bundles, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${file} (${sizeMB} MB)`);
    }
  });
} else {
  console.log('⚠️  Bundle directory not found (may be in different location)');
}

console.log('\n✅ Production build complete!');
console.log('\n📦 Build artifacts location:');
console.log(`   ${bundles}`);
console.log('\n📝 Next steps:');
console.log('   1. Test the built application');
console.log('   2. Create GitHub release');
console.log('   3. Upload installer to release');
console.log('   4. Update version number for next release\n');



