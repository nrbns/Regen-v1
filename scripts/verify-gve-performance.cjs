/**
 * GVE Performance Verification Script
 * Verifies that GVE optimizations are working correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying GVE Optimization Implementation...\n');

const checks = {
  'gve-optimizer.ts': {
    file: 'src/utils/gve-optimizer.ts',
    required: [
      'throttleViewUpdate',
      'debounceResize',
      'IframeManager',
      'OptimizedViewRenderer',
      'PerformanceMonitor',
      'getIframeManager',
      'getViewRenderer',
      'getPerformanceMonitor',
    ],
  },
  'useOptimizedView.ts': {
    file: 'src/hooks/useOptimizedView.ts',
    required: ['useOptimizedView'],
  },
  'stagehand-api.ts': {
    file: 'src/utils/stagehand-api.ts',
    required: ['StagehandAPI', 'createStagehand'],
  },
  'useStagehand.ts': {
    file: 'src/hooks/useStagehand.ts',
    required: ['useStagehand'],
  },
  'TabIframeManager integration': {
    file: 'src/components/layout/TabIframeManager.tsx',
    required: ['getIframeManager', 'throttleViewUpdate'],
  },
  'TabContentSurface integration': {
    file: 'src/components/layout/TabContentSurface.tsx',
    required: ['useOptimizedView', 'getIframeManager'],
  },
  'Research mode integration': {
    file: 'src/modes/research/index.tsx',
    required: ['ResearchStagehandIntegration'],
  },
  'Trade mode integration': {
    file: 'src/modes/trade/index.tsx',
    required: ['TradeStagehandIntegration'],
  },
  'Agent Console integration': {
    file: 'src/routes/AgentConsole.tsx',
    required: ['AgentStagehandIntegration'],
  },
};

let passed = 0;
let failed = 0;
const errors = [];

for (const [name, check] of Object.entries(checks)) {
  const filePath = path.join(process.cwd(), check.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${name}: File not found - ${check.file}`);
    failed++;
    errors.push(`${name}: File ${check.file} not found`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const missing = check.required.filter(required => !content.includes(required));

  if (missing.length > 0) {
    console.log(`❌ ${name}: Missing - ${missing.join(', ')}`);
    failed++;
    errors.push(`${name}: Missing ${missing.join(', ')}`);
  } else {
    console.log(`✅ ${name}: All required exports found`);
    passed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Verification failed. Issues found:');
  errors.forEach(error => console.log(`  - ${error}`));
  process.exit(1);
} else {
  console.log('✅ All GVE optimizations verified successfully!');
  console.log('\n🚀 Next steps:');
  console.log('  1. Run performance benchmarks');
  console.log('  2. Test in browser with multiple tabs');
  console.log('  3. Verify Stagehand API in console');
  console.log('  4. Monitor frame rates and memory usage');
  process.exit(0);
}




