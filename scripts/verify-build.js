/**
 * Build Verification Script
 * DAY 10 FIX: Verifies build artifacts and checks for common issues
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ERRORS = [];
const WARNINGS = [];

function checkFileExists(filePath, errorMessage) {
  if (!fs.existsSync(filePath)) {
    ERRORS.push(errorMessage);
    return false;
  }
  return true;
}

function checkFileSize(filePath, maxSizeMB, warningMessage) {
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      WARNINGS.push(`${warningMessage} (${sizeMB.toFixed(2)}MB)`);
    }
  }
}

function checkDirectory(dirPath, errorMessage) {
  if (!fs.existsSync(dirPath)) {
    ERRORS.push(errorMessage);
    return false;
  }
  
  const files = fs.readdirSync(dirPath);
  if (files.length === 0) {
    ERRORS.push(`${errorMessage}: Directory is empty`);
    return false;
  }
  
  return true;
}

console.log('🔍 Verifying build artifacts...\n');

// Check dist directory exists
if (!checkDirectory(DIST_DIR, 'dist directory not found')) {
  console.error('❌ Build verification failed: dist directory missing');
  process.exit(1);
}

// Check for main entry files
const rendererDir = path.join(DIST_DIR, 'renderer');
checkDirectory(rendererDir, 'dist/renderer directory not found');

// Check for index.html
checkFileExists(
  path.join(DIST_DIR, 'index.html'),
  'dist/index.html not found'
);

// Check for main JS bundle
const jsFiles = fs.readdirSync(rendererDir).filter(f => f.endsWith('.js'));
if (jsFiles.length === 0) {
  ERRORS.push('No JavaScript bundles found in dist/renderer');
} else {
  // Check bundle sizes
  jsFiles.forEach(file => {
    const filePath = path.join(rendererDir, file);
    checkFileSize(filePath, 5, `Large bundle: ${file}`);
  });
}

// Check for CSS files
const cssFiles = fs.readdirSync(rendererDir).filter(f => f.endsWith('.css'));
if (cssFiles.length === 0) {
  WARNINGS.push('No CSS files found in dist/renderer');
}

// Check for source maps (optional but recommended)
const mapFiles = fs.readdirSync(rendererDir).filter(f => f.endsWith('.map'));
if (mapFiles.length === 0) {
  WARNINGS.push('No source maps found (recommended for debugging)');
}

// Check Tauri build artifacts (if building Tauri app)
const tauriDist = path.join(__dirname, '..', 'tauri-migration', 'src-tauri', 'target');
if (fs.existsSync(tauriDist)) {
  const releaseDir = path.join(tauriDist, 'release');
  if (fs.existsSync(releaseDir)) {
    const exeFiles = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe'));
    if (exeFiles.length > 0) {
      exeFiles.forEach(file => {
        const filePath = path.join(releaseDir, file);
        checkFileSize(filePath, 100, `Large executable: ${file}`);
      });
    }
  }
}

// Report results
console.log('\n📊 Build Verification Results:\n');

if (ERRORS.length > 0) {
  console.error('❌ Errors:');
  ERRORS.forEach(error => console.error(`  - ${error}`));
  console.error('\n❌ Build verification failed!');
  process.exit(1);
}

if (WARNINGS.length > 0) {
  console.warn('⚠️  Warnings:');
  WARNINGS.forEach(warning => console.warn(`  - ${warning}`));
}

console.log('✅ Build verification passed!');
console.log(`\n📦 Build artifacts:`);
console.log(`  - Frontend: ${DIST_DIR}`);
if (fs.existsSync(tauriDist)) {
  console.log(`  - Tauri: ${tauriDist}`);
}

process.exit(0);

