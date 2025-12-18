#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes dist-web/ build output and reports on chunk sizes
 * Usage: node scripts/analyze-bundle.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist-web');
const SIZE_LIMITS = {
  chunk: 500 * 1024, // 500 KB
  vendor: 800 * 1024, // 800 KB for vendor bundles
  total: 3 * 1024 * 1024, // 3 MB total
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

function analyzeDirectory(dir, basePath = '') {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...analyzeDirectory(fullPath, relativePath));
    } else if (stats.isFile() && /\.(js|css)$/.test(item)) {
      files.push({
        path: relativePath,
        size: stats.size,
        type: item.endsWith('.js') ? 'js' : 'css',
      });
    }
  }

  return files;
}

function categorizeFiles(files) {
  const categories = {
    vendor: [],
    chunks: [],
    assets: [],
    modes: [],
    other: [],
  };

  for (const file of files) {
    if (file.path.includes('vendor')) {
      categories.vendor.push(file);
    } else if (file.path.includes('mode-')) {
      categories.modes.push(file);
    } else if (file.path.includes('chunks/')) {
      categories.chunks.push(file);
    } else if (file.path.includes('assets/')) {
      categories.assets.push(file);
    } else {
      categories.other.push(file);
    }
  }

  return categories;
}

function printReport(categories) {
  console.log('\n📦 Bundle Size Analysis Report\n');
  console.log('='.repeat(80));

  let totalSize = 0;
  let warnings = [];

  // Vendor bundles
  console.log('\n🔧 Vendor Bundles:');
  console.log('-'.repeat(80));
  const vendorTotal = categories.vendor.reduce((sum, f) => {
    const size = f.size;
    totalSize += size;
    const status = size > SIZE_LIMITS.vendor ? '⚠️' : '✓';
    console.log(`  ${status} ${f.path.padEnd(50)} ${formatBytes(size).padStart(10)}`);
    if (size > SIZE_LIMITS.vendor) {
      warnings.push(
        `${f.path} exceeds vendor limit (${formatBytes(size)} > ${formatBytes(SIZE_LIMITS.vendor)})`
      );
    }
    return sum + size;
  }, 0);
  console.log(`  ${'TOTAL VENDOR'.padEnd(50)} ${formatBytes(vendorTotal).padStart(10)}`);

  // Mode chunks
  console.log('\n📍 Mode Chunks:');
  console.log('-'.repeat(80));
  const modesTotal = categories.modes.reduce((sum, f) => {
    const size = f.size;
    totalSize += size;
    const status = size > SIZE_LIMITS.chunk ? '⚠️' : '✓';
    console.log(`  ${status} ${f.path.padEnd(50)} ${formatBytes(size).padStart(10)}`);
    if (size > SIZE_LIMITS.chunk) {
      warnings.push(
        `${f.path} exceeds chunk limit (${formatBytes(size)} > ${formatBytes(SIZE_LIMITS.chunk)})`
      );
    }
    return sum + size;
  }, 0);
  console.log(`  ${'TOTAL MODES'.padEnd(50)} ${formatBytes(modesTotal).padStart(10)}`);

  // Other chunks
  console.log('\n🧩 Other Chunks:');
  console.log('-'.repeat(80));
  const chunksTotal = categories.chunks.reduce((sum, f) => {
    const size = f.size;
    totalSize += size;
    const status = size > SIZE_LIMITS.chunk ? '⚠️' : '✓';
    console.log(`  ${status} ${f.path.padEnd(50)} ${formatBytes(size).padStart(10)}`);
    if (size > SIZE_LIMITS.chunk) {
      warnings.push(
        `${f.path} exceeds chunk limit (${formatBytes(size)} > ${formatBytes(SIZE_LIMITS.chunk)})`
      );
    }
    return sum + size;
  }, 0);
  console.log(`  ${'TOTAL CHUNKS'.padEnd(50)} ${formatBytes(chunksTotal).padStart(10)}`);

  // Assets
  console.log('\n🎨 Assets (CSS, Entry Points):');
  console.log('-'.repeat(80));
  const assetsTotal = [...categories.assets, ...categories.other].reduce((sum, f) => {
    const size = f.size;
    totalSize += size;
    console.log(`  ✓ ${f.path.padEnd(50)} ${formatBytes(size).padStart(10)}`);
    return sum + size;
  }, 0);
  console.log(`  ${'TOTAL ASSETS'.padEnd(50)} ${formatBytes(assetsTotal).padStart(10)}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 SUMMARY:`);
  console.log(`  Total Bundle Size: ${formatBytes(totalSize)}`);
  console.log(`  Size Limit: ${formatBytes(SIZE_LIMITS.total)}`);

  if (totalSize > SIZE_LIMITS.total) {
    console.log(
      `  ⚠️  WARNING: Total size exceeds limit by ${formatBytes(totalSize - SIZE_LIMITS.total)}`
    );
  } else {
    console.log(
      `  ✅ Total size within limit (${formatBytes(SIZE_LIMITS.total - totalSize)} remaining)`
    );
  }

  console.log(
    `\n  Vendor Bundles: ${formatBytes(vendorTotal)} (${((vendorTotal / totalSize) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Mode Chunks: ${formatBytes(modesTotal)} (${((modesTotal / totalSize) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Other Chunks: ${formatBytes(chunksTotal)} (${((chunksTotal / totalSize) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Assets: ${formatBytes(assetsTotal)} (${((assetsTotal / totalSize) * 100).toFixed(1)}%)`
  );

  // Warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    console.log('-'.repeat(80));
    warnings.forEach(w => console.log(`  • ${w}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('');

  // Exit with error if over limit
  if (totalSize > SIZE_LIMITS.total || warnings.length > 0) {
    process.exit(1);
  }
}

// Main
try {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist-web/ directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const files = analyzeDirectory(DIST_DIR);
  const categories = categorizeFiles(files);
  printReport(categories);
} catch (error) {
  console.error('❌ Error analyzing bundle:', error.message);
  process.exit(1);
}
