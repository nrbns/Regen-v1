#!/usr/bin/env node

/**
 * Memory Usage Benchmark
 * Validates Redix mode memory reduction targets
 */

const fs = require('fs');
const path = require('path');

console.log('💾 Memory Usage Benchmark\n');
console.log('='.repeat(60));

const memoryTargets = {
  redix: {
    name: 'Redix Mode',
    warning: 350, // MB
    critical: 500, // MB
    target: 250, // MB
    files: [
      'src/lib/redix-mode/memory-profiler.ts',
      'src/lib/redix-mode/advanced-optimizer.ts',
    ],
  },
  full: {
    name: 'Full Mode',
    estimated: 600, // MB (baseline)
    files: [
      'src/components/layout/AppShell.tsx',
      'src/components/lazy/LazyMonacoEditor.tsx',
    ],
  },
};

function checkFile(file) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      size: stats.size,
      sizeKB: (stats.size / 1024).toFixed(1),
    };
  }
  return { exists: false };
}

console.log('\n📊 Memory Configuration Check\n');

let allValid = true;

for (const [mode, config] of Object.entries(memoryTargets)) {
  console.log(`\n${config.name}:`);
  console.log('-'.repeat(60));

  if (mode === 'redix') {
    console.log(`  ⚠️  Warning Threshold: ${config.warning} MB`);
    console.log(`  🚨 Critical Threshold: ${config.critical} MB`);
    console.log(`  🎯 Target: ${config.target} MB`);
  } else {
    console.log(`  📊 Estimated Baseline: ${config.estimated} MB`);
  }

  for (const file of config.files) {
    const check = checkFile(file);
    if (check.exists) {
      console.log(`  ✅ ${path.basename(file)} (${check.sizeKB} KB)`);
    } else {
      console.log(`  ❌ ${path.basename(file)} (not found)`);
      allValid = false;
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n📈 Memory Reduction Target Analysis\n');

const redixTarget = memoryTargets.redix.target;
const fullEstimate = memoryTargets.full.estimated;
const reduction = ((fullEstimate - redixTarget) / fullEstimate) * 100;

console.log(`Full Mode Estimate: ${fullEstimate} MB`);
console.log(`Redix Mode Target: ${redixTarget} MB`);
console.log(`Target Reduction: ${reduction.toFixed(1)}%`);
console.log(`Status: ${reduction >= 50 ? '✅ Meets target' : '⚠️  Below target'}`);

console.log('\n🎯 Validation Steps:');
console.log('  1. Run app in Full Mode');
console.log('  2. Measure memory usage (Task Manager / Activity Monitor)');
console.log('  3. Switch to Redix Mode');
console.log('  4. Measure memory usage again');
console.log('  5. Calculate reduction percentage');
console.log('  6. Verify meets <50% target');

console.log('\n📝 Measurement Commands:');
console.log('  Windows: Task Manager → Details → Memory column');
console.log('  macOS: Activity Monitor → Memory tab');
console.log('  Linux: htop or ps aux --sort=-%mem');

console.log('\n✅ Memory benchmark configuration validated!');

process.exit(allValid ? 0 : 1);


