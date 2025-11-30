#!/usr/bin/env node
/**
 * Bundle Analysis Script
 * DAY 7 FIX: Analyzes bundle size and identifies large dependencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Analyzing bundle size...\n');

// Check if dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Analyze bundle files
const bundleFiles = fs.readdirSync(distDir).filter(file => 
  file.endsWith('.js') && !file.includes('worker')
);

let totalSize = 0;
const fileSizes = [];

bundleFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  const stats = fs.statSync(filePath);
  const sizeMB = stats.size / 1024 / 1024;
  totalSize += sizeMB;
  fileSizes.push({ file, size: sizeMB, bytes: stats.size });
});

// Sort by size
fileSizes.sort((a, b) => b.size - a.size);

console.log('📊 Bundle Size Report\n');
console.log('─'.repeat(60));
console.log(`${'File'.padEnd(40)} ${'Size'.padStart(15)}`);
console.log('─'.repeat(60));

fileSizes.forEach(({ file, size }) => {
  const sizeStr = size > 1 ? `${size.toFixed(2)} MB` : `${(size * 1024).toFixed(2)} KB`;
  console.log(`${file.padEnd(40)} ${sizeStr.padStart(15)}`);
});

console.log('─'.repeat(60));
console.log(`${'TOTAL'.padEnd(40)} ${totalSize.toFixed(2).padStart(15)} MB`);
console.log('─'.repeat(60));

// Warn about large files
const largeFiles = fileSizes.filter(f => f.size > 1);
if (largeFiles.length > 0) {
  console.log('\n⚠️  Large files (>1MB):');
  largeFiles.forEach(({ file, size }) => {
    console.log(`   - ${file}: ${size.toFixed(2)} MB`);
  });
}

// Recommendations
console.log('\n💡 Recommendations:');
if (totalSize > 5) {
  console.log('   - Bundle size exceeds 5MB. Consider code splitting.');
}
if (largeFiles.length > 0) {
  console.log('   - Large files detected. Consider lazy loading.');
}
console.log('   - Use source-map-explorer for detailed analysis:');
console.log('     npx source-map-explorer dist/*.js');

// Try to use source-map-explorer if available
try {
  console.log('\n🔍 Running source-map-explorer...');
  execSync('npx source-map-explorer dist/*.js --json', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (e) {
  console.log('   (source-map-explorer not available or failed)');
}

console.log('\n✅ Analysis complete!');

