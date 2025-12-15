/**
 * SPRINT 0: Bundle size check
 * Checks that JS bundle size is under 500KB gzipped
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const DIST_DIR = path.join(__dirname, '../../dist-web');
const MAX_SIZE = 500 * 1024; // 500KB

function getBundleSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);
    return gzipped.length;
  } catch (error) {
    return 0;
  }
}

function checkBundleSize() {
  if (!fs.existsSync(DIST_DIR)) {
    console.log('\n⚠️  Build directory not found. Run "npm run build" first.\n');
    process.exit(1);
  }

  const jsFiles = fs.readdirSync(DIST_DIR)
    .filter(file => file.endsWith('.js') && file.includes('assets'))
    .map(file => path.join(DIST_DIR, file));

  if (jsFiles.length === 0) {
    // Check chunks directory if it exists
    const chunksDir = path.join(DIST_DIR, 'chunks');
    if (fs.existsSync(chunksDir)) {
      const chunkFiles = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.js'))
        .map(file => path.join(chunksDir, file));
      jsFiles.push(...chunkFiles);
    }
  }

  if (jsFiles.length === 0) {
    console.log('\n⚠️  No JS files found in build directory.\n');
    process.exit(1);
  }

  let totalSize = 0;
  const sizes = {};

  jsFiles.forEach(file => {
    const size = getBundleSize(file);
    const fileName = path.basename(file);
    sizes[fileName] = size;
    totalSize += size;
  });

  console.log('\n📦 Bundle Size Report:');
  console.log('=====================\n');
  
  Object.entries(sizes)
    .sort((a, b) => b[1] - a[1]) // Sort by size descending
    .forEach(([file, size]) => {
      const sizeKB = (size / 1024).toFixed(2);
      const status = size > MAX_SIZE ? '❌' : '✅';
      console.log(`${status} ${file}: ${sizeKB} KB`);
    });

  console.log(`\nTotal: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`Target: ${(MAX_SIZE / 1024).toFixed(2)} KB\n`);

  if (totalSize > MAX_SIZE) {
    console.error(`❌ FAIL: Total bundle size (${(totalSize / 1024).toFixed(2)}KB) exceeds ${(MAX_SIZE / 1024).toFixed(2)}KB`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Bundle size (${(totalSize / 1024).toFixed(2)}KB) under ${(MAX_SIZE / 1024).toFixed(2)}KB`);
    process.exit(0);
  }
}

checkBundleSize();

