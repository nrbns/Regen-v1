#!/usr/bin/env node
/**
 * Clean cache files and unwanted build artifacts
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// Directories to remove
const dirsToRemove = [
  'dist',
  'dist-electron',
  'dist-web',
  'build',
  'out',
  'playwright-report',
  'test-results',
  'coverage',
  '.nyc_output',
  '.cache',
  '.temp',
  'tmp',
  'node_modules/.cache',
  'packages/*/dist',
  'packages/*/node_modules/.cache',
  'redix-core/runtime/pkg',
];

// Files to remove
const filesToRemove = [
  '*.tsbuildinfo',
  '*.log',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'pnpm-debug.log*',
  '.dev-all.lock',
  '.electron-dev.lock',
];

// Patterns for unwanted markdown files (summary/status files)
const unwantedMdFiles = [
  '*_IMPLEMENTATION*.md',
  '*_ROADMAP*.md',
  '*_STATUS*.md',
  '*_COMPLETE*.md',
  '*_FIXES*.md',
  '*_SUMMARY*.md',
  'FILES_STRUCTURE.md',
  'PRIVACY_STACK_IMPLEMENTATION.md',
];

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Removed: ${dirPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove ${dirPath}:`, error.message);
      return false;
    }
  }
  return false;
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove ${filePath}:`, error.message);
      return false;
    }
  }
  return false;
}

function findFiles(pattern, rootDir) {
  const files = [];
  const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\./g, '\\.'));

  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip node_modules and .git
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            walkDir(fullPath);
          }
        } else if (entry.isFile() && regex.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  walkDir(rootDir);
  return files;
}

console.log('🧹 Cleaning cache files and unwanted files...\n');

let removedCount = 0;

// Remove directories
console.log('📁 Removing directories...');
for (const dir of dirsToRemove) {
  // Handle glob patterns
  if (dir.includes('*')) {
    const baseDir = dir.split('/*')[0];
    const fullPath = path.join(projectRoot, baseDir);
    if (fs.existsSync(fullPath)) {
      try {
        const entries = fs.readdirSync(fullPath);
        for (const entry of entries) {
          const entryPath = path.join(fullPath, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            const targetPath = path.join(entryPath, dir.split('*/')[1] || '');
            if (fs.existsSync(targetPath)) {
              if (removeDir(targetPath)) removedCount++;
            }
          }
        }
      } catch (error) {
        // Ignore
      }
    }
  } else {
    const fullPath = path.join(projectRoot, dir);
    if (removeDir(fullPath)) removedCount++;
  }
}

// Remove specific files
console.log('\n📄 Removing files...');
for (const filePattern of filesToRemove) {
  if (filePattern.includes('*')) {
    const files = findFiles(filePattern, projectRoot);
    for (const file of files) {
      if (removeFile(file)) removedCount++;
    }
  } else {
    const fullPath = path.join(projectRoot, filePattern);
    if (removeFile(fullPath)) removedCount++;
  }
}

// Remove unwanted markdown files
console.log('\n📝 Removing unwanted markdown files...');
for (const pattern of unwantedMdFiles) {
  const files = findFiles(pattern, projectRoot);
  for (const file of files) {
    // Only remove from root directory, not from docs/
    const relativePath = path.relative(projectRoot, file);
    if (!relativePath.startsWith('docs' + path.sep) && !relativePath.startsWith('docs\\')) {
      if (removeFile(file)) removedCount++;
    }
  }
}

// Remove Python cache
console.log('\n🐍 Removing Python cache...');
function removePythonCache(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__' || entry.name === '.pytest_cache') {
          if (removeDir(fullPath)) removedCount++;
        } else if (entry.name !== 'node_modules' && entry.name !== '.git') {
          removePythonCache(fullPath);
        }
      } else if (
        entry.name.endsWith('.pyc') ||
        entry.name.endsWith('.pyo') ||
        entry.name.endsWith('.pyd') ||
        entry.name === '.Python'
      ) {
        if (removeFile(fullPath)) removedCount++;
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
}

// Only scan specific Python directories
const pythonDirs = ['apps/api', 'redix-core', 'omnibrowser-redix-memory-kit/server'];
for (const dir of pythonDirs) {
  const fullPath = path.join(projectRoot, dir);
  if (fs.existsSync(fullPath)) {
    removePythonCache(fullPath);
  }
}

// Remove OS-specific files
console.log('\n💻 Removing OS-specific files...');
const osFiles = ['.DS_Store', 'Thumbs.db', 'desktop.ini'];
for (const osFile of osFiles) {
  const files = findFiles(osFile, projectRoot);
  for (const file of files) {
    if (removeFile(file)) removedCount++;
  }
}

console.log(`\n✨ Cleanup complete! Removed ${removedCount} items.`);
console.log('\n💡 Tip: Run "npm install" if you need to reinstall dependencies.');
