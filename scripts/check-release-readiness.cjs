#!/usr/bin/env node
/**
 * Release Readiness Check
 * Comprehensive check before releasing to production
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Release Readiness...\n');

const ROOT_DIR = path.join(__dirname, '..');
let checksPassed = 0;
let checksFailed = 0;
let checksWarned = 0;

function check(name, condition, isWarning = false) {
  if (condition) {
    console.log(`✅ ${name}`);
    checksPassed++;
  } else {
    if (isWarning) {
      console.log(`⚠️  ${name}`);
      checksWarned++;
    } else {
      console.log(`❌ ${name}`);
      checksFailed++;
    }
  }
}

// Check 1: Core files exist
console.log('📁 Core Files:');
check('package.json exists', fs.existsSync(path.join(ROOT_DIR, 'package.json')));
check('tauri.conf.json exists', fs.existsSync(path.join(ROOT_DIR, 'tauri-migration', 'src-tauri', 'tauri.conf.json')));
check('README.md exists', fs.existsSync(path.join(ROOT_DIR, 'README.md')));

// Check 2: Build outputs
console.log('\n📦 Build Outputs:');
const distExists = fs.existsSync(path.join(ROOT_DIR, 'dist'));
const distIndexHtml = path.join(ROOT_DIR, 'dist', 'index.html');
const rootIndexHtml = path.join(ROOT_DIR, 'index.html');

check('Frontend build (dist/) exists', distExists, true); // Warning if not built yet
if (distExists) {
  // Check for index.html in dist/ or root
  const hasIndexHtml = fs.existsSync(distIndexHtml) || fs.existsSync(rootIndexHtml);
  check('index.html exists', hasIndexHtml, true); // Warning if not built yet
} else {
  console.log('⚠️  dist/ not found (run "npm run build" first)');
  // Check if root index.html exists as fallback
  if (fs.existsSync(rootIndexHtml)) {
    console.log('✅ Root index.html found (will be used for build)');
  }
}

// Check 3: Critical features
console.log('\n⚙️  Critical Features:');
check('Search API exists', fs.existsSync(path.join(ROOT_DIR, 'server', 'api', 'search.ts')));
check('Summarize API exists', fs.existsSync(path.join(ROOT_DIR, 'server', 'api', 'summarize.ts')));
check('Research Agent exists', fs.existsSync(path.join(ROOT_DIR, 'server', 'agents', 'researchAgent.ts')));
check('ErrorBoundary exists', fs.existsSync(path.join(ROOT_DIR, 'src', 'core', 'errors', 'ErrorBoundary.tsx')));
check('Sentry client exists', fs.existsSync(path.join(ROOT_DIR, 'src', 'lib', 'monitoring', 'sentry-client.ts')));

// Check 4: New features
console.log('\n✨ New Features:');
check('On-device AI service exists', fs.existsSync(path.join(ROOT_DIR, 'src', 'services', 'onDeviceAI.ts')));
check('Research Agent service exists', fs.existsSync(path.join(ROOT_DIR, 'src', 'services', 'researchAgent.ts')));
check('i18n config exists', fs.existsSync(path.join(ROOT_DIR, 'src', 'lib', 'i18n', 'config.ts')));
check('Translation files exist', fs.existsSync(path.join(ROOT_DIR, 'src', 'locales', 'en.json')));

// Check 5: Documentation
console.log('\n📚 Documentation:');
check('OFFLINE_AI_INTEGRATION.md exists', fs.existsSync(path.join(ROOT_DIR, 'docs', 'OFFLINE_AI_INTEGRATION.md')));
check('RESEARCH_AGENT_PIPELINE.md exists', fs.existsSync(path.join(ROOT_DIR, 'docs', 'RESEARCH_AGENT_PIPELINE.md')));
check('MULTILINGUAL_SETUP.md exists', fs.existsSync(path.join(ROOT_DIR, 'docs', 'MULTILINGUAL_SETUP.md')));
check('RELEASE_CHECKLIST.md exists', fs.existsSync(path.join(ROOT_DIR, 'docs', 'RELEASE_CHECKLIST.md')));

// Check 6: Configuration
console.log('\n⚙️  Configuration:');
const tauriConf = path.join(ROOT_DIR, 'tauri-migration', 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriConf)) {
  try {
    const conf = JSON.parse(fs.readFileSync(tauriConf, 'utf8'));
    check('Version is set', !!conf.version);
    check('Product name is set', !!conf.productName);
    check('Bundle targets configured', conf.bundle && conf.bundle.targets);
  } catch (e) {
    check('tauri.conf.json is valid JSON', false);
  }
}

// Check 7: Environment
console.log('\n🌍 Environment:');
check('.env.example exists', fs.existsSync(path.join(ROOT_DIR, 'example.env')), true);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${checksPassed}`);
console.log(`⚠️  Warnings: ${checksWarned}`);
console.log(`❌ Failed: ${checksFailed}`);

if (checksFailed === 0) {
  console.log('\n✅ Release readiness: PASSED');
  console.log('\n📝 Next steps:');
  console.log('   1. Run: npm run build:production');
  console.log('   2. Run: npm run verify:build');
  console.log('   3. Test installer on clean system');
  console.log('   4. Create GitHub release\n');
  process.exit(0);
} else {
  console.log('\n❌ Release readiness: FAILED');
  console.log('\n⚠️  Please fix the failed checks before releasing.\n');
  process.exit(1);
}

