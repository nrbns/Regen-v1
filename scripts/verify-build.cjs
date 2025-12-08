#!/usr/bin/env node
/**
 * Build Verification Script
 * Verifies production build is ready for release
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Production Build...\n');

const ROOT_DIR = path.join(__dirname, '..');
let allChecksPassed = true;

// Check 1: Frontend build exists
console.log('Check 1: Frontend build');
const distPath = path.join(ROOT_DIR, 'dist');
if (fs.existsSync(distPath)) {
  console.log('✅ dist/ directory exists');
  
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    console.log('✅ index.html exists');
    
    const htmlContent = fs.readFileSync(indexHtml, 'utf8');
    if (htmlContent.includes('<!DOCTYPE html>') || htmlContent.includes('<html')) {
      console.log('✅ index.html is valid');
    } else {
      console.log('❌ index.html appears invalid');
      allChecksPassed = false;
    }
  } else {
    console.log('❌ index.html not found');
    allChecksPassed = false;
  }
  
  // Check for assets
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    console.log(`✅ Found ${assets.length} asset files`);
  } else {
    console.log('⚠️  assets/ directory not found');
  }
} else {
  console.log('❌ dist/ directory not found');
  allChecksPassed = false;
}

// Check 2: Tauri build exists
console.log('\nCheck 2: Tauri build');
const tauriDir = path.join(ROOT_DIR, 'tauri-migration');
const tauriTarget = path.join(tauriDir, 'src-tauri', 'target', 'release');
const bundles = path.join(tauriTarget, 'bundle');

if (fs.existsSync(bundles)) {
  console.log('✅ Tauri bundle directory exists');
  
  const bundleFiles = fs.readdirSync(bundles);
  const installers = bundleFiles.filter(f => 
    f.endsWith('.exe') || f.endsWith('.msi') || f.endsWith('.dmg') || f.endsWith('.AppImage')
  );
  
  if (installers.length > 0) {
    console.log(`✅ Found ${installers.length} installer(s):`);
    installers.forEach(installer => {
      const installerPath = path.join(bundles, installer);
      const stats = fs.statSync(installerPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${installer} (${sizeMB} MB)`);
    });
  } else {
    console.log('⚠️  No installers found in bundle directory');
  }
} else {
  console.log('⚠️  Tauri bundle directory not found (build may not be complete)');
}

// Check 3: Configuration files
console.log('\nCheck 3: Configuration files');
const tauriConf = path.join(tauriDir, 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConf)) {
  console.log('✅ tauri.conf.json exists');
  
  try {
    const conf = JSON.parse(fs.readFileSync(tauriConf, 'utf8'));
    if (conf.productName && conf.version) {
      console.log(`✅ Product: ${conf.productName} v${conf.version}`);
    }
  } catch (error) {
    console.log('❌ tauri.conf.json is invalid JSON');
    allChecksPassed = false;
  }
} else {
  console.log('❌ tauri.conf.json not found');
  allChecksPassed = false;
}

// Check 4: Icons exist
console.log('\nCheck 4: Application icons');
const iconsDir = path.join(tauriDir, 'src-tauri', 'icons');
if (fs.existsSync(iconsDir)) {
  const requiredIcons = ['32x32.png', '128x128.png', 'icon.ico', 'icon.icns'];
  let iconsFound = 0;
  
  requiredIcons.forEach(icon => {
    if (fs.existsSync(path.join(iconsDir, icon))) {
      iconsFound++;
    }
  });
  
  if (iconsFound === requiredIcons.length) {
    console.log('✅ All required icons found');
  } else {
    console.log(`⚠️  Only ${iconsFound}/${requiredIcons.length} icons found`);
  }
} else {
  console.log('⚠️  Icons directory not found');
}

// Check 5: Error handling
console.log('\nCheck 5: Error handling');
const errorBoundary = path.join(ROOT_DIR, 'src', 'core', 'errors', 'ErrorBoundary.tsx');
if (fs.existsSync(errorBoundary)) {
  console.log('✅ ErrorBoundary exists');
} else {
  console.log('⚠️  ErrorBoundary not found');
}

// Check 6: Sentry integration
console.log('\nCheck 6: Crash reporting');
const sentryClient = path.join(ROOT_DIR, 'src', 'lib', 'monitoring', 'sentry-client.ts');
if (fs.existsSync(sentryClient)) {
  console.log('✅ Sentry client exists');
} else {
  console.log('⚠️  Sentry client not found');
}

// Final summary
console.log('\n' + '='.repeat(50));
if (allChecksPassed) {
  console.log('✅ Build verification PASSED');
  console.log('\n📦 Build is ready for release!');
  console.log('\n📝 Release checklist:');
  console.log('   [ ] Test installer on clean system');
  console.log('   [ ] Verify all features work');
  console.log('   [ ] Check crash reporting');
  console.log('   [ ] Update version number');
  console.log('   [ ] Create GitHub release');
  console.log('   [ ] Upload installer to release\n');
  process.exit(0);
} else {
  console.log('❌ Build verification FAILED');
  console.log('\n⚠️  Please fix the issues above before releasing.\n');
  process.exit(1);
}


