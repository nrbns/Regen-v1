#!/usr/bin/env node

/**
 * Run All Benchmarks
 * Executes all performance and memory benchmarks
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running All Benchmarks\n');
console.log('='.repeat(60));

const benchmarks = [
  {
    name: 'Performance Benchmark',
    script: 'scripts/benchmark-performance.cjs',
  },
  {
    name: 'Memory Benchmark',
    script: 'scripts/benchmark-memory.cjs',
  },
  {
    name: 'Latency Benchmark',
    script: 'scripts/benchmark-latency.cjs',
  },
];

let totalPassed = 0;
let totalFailed = 0;

for (const benchmark of benchmarks) {
  console.log(`\n📊 Running: ${benchmark.name}`);
  console.log('-'.repeat(60));

  try {
    execSync(`node ${benchmark.script}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    totalPassed++;
    console.log(`\n✅ ${benchmark.name}: PASSED\n`);
  } catch (error) {
    totalFailed++;
    console.log(`\n❌ ${benchmark.name}: FAILED\n`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n📊 Benchmark Summary');
console.log('-'.repeat(60));
console.log(`✅ Passed: ${totalPassed}/${benchmarks.length}`);
console.log(`❌ Failed: ${totalFailed}/${benchmarks.length}`);
console.log(`📈 Success Rate: ${((totalPassed / benchmarks.length) * 100).toFixed(1)}%`);

if (totalFailed === 0) {
  console.log('\n🎉 All benchmarks passed!');
  console.log('\n📝 Next Steps:');
  console.log('  1. Run in-browser performance tests');
  console.log('  2. Measure actual runtime performance');
  console.log('  3. Compare against targets');
  console.log('  4. Optimize as needed');
  process.exit(0);
} else {
  console.log('\n⚠️  Some benchmarks failed. Review output above.');
  process.exit(1);
}


