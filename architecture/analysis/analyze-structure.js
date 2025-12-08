#!/usr/bin/env node

/**
 * Architecture Structure Analyzer
 * 
 * Analyzes the project structure and provides insights about:
 * - Directory organization
 * - File distribution
 * - Dependencies
 * - Architecture patterns
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getFileStats(dir, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return null;

  const stats = {
    files: 0,
    directories: 0,
    totalSize: 0,
    extensions: {},
    subdirectories: {},
  };

  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          stats.directories++;
          const subStats = getFileStats(fullPath, depth + 1, maxDepth);
          if (subStats) {
            stats.subdirectories[item] = subStats;
          }
        }
      } else {
        stats.files++;
        stats.totalSize += stat.size;
        
        const ext = path.extname(item) || 'no-extension';
        stats.extensions[ext] = (stats.extensions[ext] || 0) + 1;
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return stats;
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function printStats(stats, prefix = '') {
  log(`${prefix}📊 Statistics:`, 'cyan');
  log(`${prefix}  Files: ${stats.files}`, 'green');
  log(`${prefix}  Directories: ${stats.directories}`, 'green');
  log(`${prefix}  Total Size: ${formatSize(stats.totalSize)}`, 'green');
  
  if (Object.keys(stats.extensions).length > 0) {
    log(`\n${prefix}📄 File Types:`, 'cyan');
    const sortedExts = Object.entries(stats.extensions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedExts.forEach(([ext, count]) => {
      log(`${prefix}  ${ext || '(no extension)'}: ${count}`, 'yellow');
    });
  }
  
  if (Object.keys(stats.subdirectories).length > 0) {
    log(`\n${prefix}📁 Subdirectories:`, 'cyan');
    Object.entries(stats.subdirectories).forEach(([name, subStats]) => {
      log(`\n${prefix}  ${name}/`, 'blue');
      printStats(subStats, prefix + '    ');
    });
  }
}

async function analyzeStructure() {
  log('\n🔍 Analyzing Project Structure...\n', 'blue');

  const rootDir = process.cwd();
  const targetDirs = ['src', 'server', 'scripts', 'architecture'];
  
  for (const dir of targetDirs) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      log(`\n📂 Analyzing: ${dir}/`, 'blue');
      log('─'.repeat(50), 'cyan');
      const stats = getFileStats(fullPath);
      if (stats) {
        printStats(stats);
      }
    }
  }

  log('\n✅ Analysis complete!\n', 'green');
}

// Run if called directly
if (require.main === module) {
  analyzeStructure().catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { analyzeStructure };

