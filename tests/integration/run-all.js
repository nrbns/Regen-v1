/**
 * Run All Integration Tests
 *
 * Usage: node tests/integration/run-all.js
 */

const { testVoiceToResearchFlow } = require('./voice-to-research.test');
const { testTabToGVEFlow } = require('./tab-to-gve.test');
const { testOfflineToOnlineFlow } = require('./offline-to-online.test');

const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
};

async function runAllTests() {
  console.log('🚀 Running All Integration Tests');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${results.timestamp}\n`);

  const tests = [
    { name: 'Voice → Research', fn: testVoiceToResearchFlow },
    { name: 'Tab → GVE', fn: testTabToGVEFlow },
    { name: 'Offline → Online', fn: testOfflineToOnlineFlow },
  ];

  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log('-'.repeat(60));

    try {
      const result = await test.fn();
      results.tests.push({
        name: test.name,
        ...result,
      });

      results.summary.total++;
      if (result.success) {
        results.summary.passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        results.summary.failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      results.tests.push({
        name: test.name,
        success: false,
        error: error.message,
      });
      results.summary.total++;
      results.summary.failed++;
      console.log(`❌ ${test.name}: FAILED (${error.message})`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INTEGRATION TESTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log('='.repeat(60));

  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.tests.forEach(test => {
    const status = test.success ? '✅' : '❌';
    const duration = test.duration ? ` (${test.duration}ms)` : '';
    console.log(`  ${status} ${test.name}${duration}`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });

  // Exit code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, results };
