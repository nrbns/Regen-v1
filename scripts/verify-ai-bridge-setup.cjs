/**
 * Verify AI Bridge setup is complete
 */

const fs = require('fs');
const path = require('path');

const AI_BRIDGE_DIR = path.join(__dirname, '..', 'server', 'ai-bridge');

console.log('🔍 Verifying AI Bridge setup...\n');

let allGood = true;

// Check required files
const requiredFiles = [
  'index.js',
  'package.json',
  'README.md',
  '.gitignore'
];

console.log('📁 Checking required files...');
for (const file of requiredFiles) {
  const filePath = path.join(AI_BRIDGE_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allGood = false;
  }
}

// Check optional files
console.log('\n📁 Checking optional files...');
const optionalFiles = [
  '.env',
  '.env.example',
  '.bridge_token'
];

for (const file of optionalFiles) {
  const filePath = path.join(AI_BRIDGE_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ⚠️  ${file} - Not present (will be created on first run)`);
  }
}

// Check node_modules
console.log('\n📦 Checking dependencies...');
const nodeModulesPath = path.join(AI_BRIDGE_DIR, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('  ✅ node_modules exists');
  
  // Check key dependencies
  const keyDeps = ['express', 'cors', 'dotenv'];
  for (const dep of keyDeps) {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      console.log(`  ✅ ${dep} installed`);
    } else {
      console.log(`  ❌ ${dep} - NOT INSTALLED`);
      allGood = false;
    }
  }
} else {
  console.log('  ⚠️  node_modules not found - run: cd server/ai-bridge && npm ci');
}

// Check scripts in root package.json
console.log('\n📜 Checking npm scripts...');
const rootPackageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));
const requiredScripts = ['dev:ai-bridge', 'dev:with-ai', 'test:ai-bridge'];

for (const script of requiredScripts) {
  if (rootPackageJson.scripts && rootPackageJson.scripts[script]) {
    console.log(`  ✅ ${script}`);
  } else {
    console.log(`  ❌ ${script} - MISSING`);
    allGood = false;
  }
}

// Check UI components
console.log('\n🎨 Checking UI integration...');
const uiComponents = [
  'src/components/AIPanel.tsx',
  'src/routes/AIPanelRoute.tsx'
];

for (const component of uiComponents) {
  const componentPath = path.join(__dirname, '..', component);
  if (fs.existsSync(componentPath)) {
    console.log(`  ✅ ${component}`);
  } else {
    console.log(`  ❌ ${component} - MISSING`);
    allGood = false;
  }
}

// Check route in main.tsx
console.log('\n🔗 Checking router integration...');
const mainTsxPath = path.join(__dirname, '..', 'src', 'main.tsx');
if (fs.existsSync(mainTsxPath)) {
  const mainTsxContent = fs.readFileSync(mainTsxPath, 'utf-8');
  if (mainTsxContent.includes('AIPanelRoute') || mainTsxContent.includes('ai-panel')) {
    console.log('  ✅ AIPanel route integrated');
  } else {
    console.log('  ⚠️  AIPanel route not found in router');
  }
} else {
  console.log('  ⚠️  main.tsx not found');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ AI Bridge setup verification: PASSED');
  console.log('\nEverything looks good! You can now:');
  console.log('  1. Start AI Bridge: cd server/ai-bridge && node index.js');
  console.log('  2. Test it: npm run test:ai-bridge');
  console.log('  3. Use with UI: npm run dev:with-ai');
} else {
  console.log('❌ AI Bridge setup verification: FAILED');
  console.log('\nPlease fix the issues above and run again.');
  process.exit(1);
}

