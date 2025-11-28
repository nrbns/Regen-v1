#!/usr/bin/env node
/**
 * Build One-Click Installer with Ollama Auto-Install
 * Creates installer that downloads and installs Ollama automatically
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const TAURI_DIR = path.join(ROOT_DIR, 'tauri-migration');

console.log('🚀 Building One-Click Installer for RegenBrowser...\n');
console.log('   This will create an installer that auto-downloads Ollama!\n');

// Step 1: Build frontend
console.log('📦 Step 1: Building frontend...');
try {
  execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Step 2: Check for NSIS (Windows installer tool)
console.log('🔍 Step 2: Checking for NSIS...');
try {
  execSync('makensis /VERSION', { stdio: 'pipe' });
  console.log('✅ NSIS found\n');
} catch (error) {
  console.error('❌ NSIS not found. Please install NSIS:');
  console.error('   Windows: Download from https://nsis.sourceforge.io/Download');
  console.error('   Or use Chocolatey: choco install nsis');
  process.exit(1);
}

// Step 3: Build installer
console.log('🔨 Step 3: Building installer with Ollama auto-install...');
const installerScript = path.join(ROOT_DIR, 'installer.nsi');

if (!fs.existsSync(installerScript)) {
  console.error(`❌ Installer script not found: ${installerScript}`);
  process.exit(1);
}

try {
  execSync(`makensis "${installerScript}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('\n✅ Installer build complete!');

  // Find the installer
  const installerPath = path.join(ROOT_DIR, 'RegenBrowser-Setup.exe');
  if (fs.existsSync(installerPath)) {
    const stats = fs.statSync(installerPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n📦 Installer location: ${installerPath}`);
    console.log(`📊 Installer size: ${sizeMB} MB`);
    console.log('\n🎉 Ready to distribute!');
    console.log('\n💡 This installer will:');
    console.log('   1. Install RegenBrowser');
    console.log('   2. Auto-download Ollama if not installed');
    console.log('   3. Models download on first launch');
  }
} catch (error) {
  console.error('❌ Installer build failed');
  process.exit(1);
}
