#!/usr/bin/env node
/**
 * Build Windows Installer Script
 * Builds the Tauri app for Windows with MSI installer
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const TAURI_DIR = path.join(ROOT_DIR, 'tauri-migration');

console.log('🔨 Building Windows Installer for RegenBrowser...\n');

// Step 1: Build frontend
console.log('📦 Step 1: Building frontend...');
const buildFrontend = spawn('npm', ['run', 'build'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true,
});

buildFrontend.on('close', code => {
  if (code !== 0) {
    console.error('❌ Frontend build failed');
    process.exit(1);
  }

  console.log('✅ Frontend build complete\n');

  // Step 2: Build Tauri app
  console.log('🔨 Step 2: Building Tauri app for Windows (MSI installer)...');
  console.log('   This may take 5-10 minutes on first build (compiling Rust)...\n');
  const buildTauri = spawn('npm', ['run', 'tauri:build'], {
    cwd: TAURI_DIR,
    stdio: 'inherit',
    shell: true,
  });

  buildTauri.on('close', code => {
    if (code !== 0) {
      console.error('❌ Tauri build failed');
      process.exit(1);
    }

    console.log('\n✅ Windows Installer build complete!');

    // Find the installer
    const installerPath = path.join(TAURI_DIR, 'src-tauri', 'target', 'release', 'bundle', 'msi');

    if (fs.existsSync(installerPath)) {
      const files = fs.readdirSync(installerPath);
      const msiFile = files.find(f => f.endsWith('.msi'));
      if (msiFile) {
        const fullPath = path.join(installerPath, msiFile);
        const stats = fs.statSync(fullPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`\n📦 Installer location: ${fullPath}`);
        console.log(`📊 Installer size: ${sizeMB} MB`);
        console.log('\n🎉 Ready to distribute!');
      }
    } else {
      console.log('\n⚠️  Installer directory not found. Check build output above.');
    }
  });
});
