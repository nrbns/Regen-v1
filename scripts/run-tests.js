/**
 * Test Runner Script for Regen Browser
 * Runs all automated tests and generates a report
 *
 * Usage: node scripts/run-tests.js [--load] [--performance] [--all]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_DIR = path.join(__dirname, '../test-results');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure test results directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

const results = {
  timestamp: TIMESTAMP,
  performance: null,
  load: null,
  unit: null,
  errors: [],
};

function log(message, type = 'info') {
  const prefix =
    {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
    }[type] || 'ℹ️';

  console.log(`${prefix} ${message}`);
}

function runPerformanceTest() {
  log('Running performance profiling test...', 'info');
  try {
    const output = execSync('node tests/performance/profile-tabs.js', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    log('Performance test completed', 'success');
    results.performance = {
      status: 'passed',
      output: output,
      timestamp: new Date().toISOString(),
    };

    // Save output to file
    fs.writeFileSync(path.join(TEST_RESULTS_DIR, `performance-${TIMESTAMP}.txt`), output);

    return true;
  } catch (error) {
    log(`Performance test failed: ${error.message}`, 'error');
    results.performance = {
      status: 'failed',
      error: error.message,
      output: error.stdout || error.stderr || '',
      timestamp: new Date().toISOString(),
    };
    results.errors.push('Performance test failed');
    return false;
  }
}

function runLoadTest() {
  log('Checking for k6 installation...', 'info');
  try {
    execSync('k6 version', { stdio: 'pipe' });
    log('k6 is installed', 'success');
  } catch (error) {
    log('k6 is not installed. Install with: npm install -g k6', 'warning');
    log('Skipping load test', 'warning');
    results.load = {
      status: 'skipped',
      reason: 'k6 not installed',
      timestamp: new Date().toISOString(),
    };
    return false;
  }

  log('Running k6 load test...', 'info');
  log('Note: This may take several minutes', 'info');
  try {
    const output = execSync('k6 run tests/load/k6-load-test.js', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 600000, // 10 minutes timeout
    });

    log('Load test completed', 'success');
    results.load = {
      status: 'passed',
      output: output,
      timestamp: new Date().toISOString(),
    };

    // Save output to file
    fs.writeFileSync(path.join(TEST_RESULTS_DIR, `load-${TIMESTAMP}.txt`), output);

    return true;
  } catch (error) {
    log(`Load test failed: ${error.message}`, 'error');
    results.load = {
      status: 'failed',
      error: error.message,
      output: error.stdout || error.stderr || '',
      timestamp: new Date().toISOString(),
    };
    results.errors.push('Load test failed');
    return false;
  }
}

function runUnitTests() {
  log('Running unit tests...', 'info');
  try {
    const output = execSync('npm test', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    });

    log('Unit tests completed', 'success');
    results.unit = {
      status: 'passed',
      output: output,
      timestamp: new Date().toISOString(),
    };

    // Extract test summary if available
    const match = output.match(/(\d+) passed/);
    if (match) {
      results.unit.passed = parseInt(match[1]);
    }

    return true;
  } catch (error) {
    log(`Unit tests failed: ${error.message}`, 'error');
    results.unit = {
      status: 'failed',
      error: error.message,
      output: error.stdout || error.stderr || '',
      timestamp: new Date().toISOString(),
    };
    results.errors.push('Unit tests failed');
    return false;
  }
}

function generateReport() {
  const report = {
    summary: {
      timestamp: results.timestamp,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    results: results,
  };

  // Count test results
  ['performance', 'load', 'unit'].forEach(test => {
    if (results[test]) {
      report.summary.totalTests++;
      if (results[test].status === 'passed') {
        report.summary.passed++;
      } else if (results[test].status === 'failed') {
        report.summary.failed++;
      } else if (results[test].status === 'skipped') {
        report.summary.skipped++;
      }
    }
  });

  // Save JSON report
  const reportPath = path.join(TEST_RESULTS_DIR, `report-${TIMESTAMP}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Generate markdown summary
  const markdown = `# Test Results Report

**Date**: ${new Date(results.timestamp.replace(/-/g, ':')).toLocaleString()}

## Summary

- **Total Tests**: ${report.summary.totalTests}
- **Passed**: ${report.summary.passed} ✅
- **Failed**: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : ''}
- **Skipped**: ${report.summary.skipped} ⏭️

## Test Results

### Performance Test
- **Status**: ${results.performance?.status || 'Not run'}
- **Timestamp**: ${results.performance?.timestamp || 'N/A'}

### Load Test
- **Status**: ${results.load?.status || 'Not run'}
- **Timestamp**: ${results.load?.timestamp || 'N/A'}

### Unit Tests
- **Status**: ${results.unit?.status || 'Not run'}
- **Passed**: ${results.unit?.passed || 'N/A'}
- **Timestamp**: ${results.unit?.timestamp || 'N/A'}

## Errors

${results.errors.length > 0 ? results.errors.map(e => `- ${e}`).join('\n') : 'No errors'}

---

_Generated by Regen Browser Test Runner_
`;

  const markdownPath = path.join(TEST_RESULTS_DIR, `report-${TIMESTAMP}.md`);
  fs.writeFileSync(markdownPath, markdown);

  log(`\n📊 Test report saved to: ${markdownPath}`, 'info');
  log(`📊 JSON report saved to: ${reportPath}`, 'info');

  return report;
}

function printSummary(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`⏭️  Skipped: ${report.summary.skipped}`);
  console.log('='.repeat(60));

  if (report.summary.failed > 0) {
    console.log('\n❌ Some tests failed. Check the report for details.');
    process.exit(1);
  } else if (report.summary.passed === report.summary.totalTests) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests were skipped.');
    process.exit(0);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all') || args.length === 0;
  const runPerformance = args.includes('--performance') || runAll;
  const runLoad = args.includes('--load') || runAll;
  const runUnit = args.includes('--unit') || runAll;

  console.log('🚀 Regen Browser Test Runner');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${TIMESTAMP}\n`);

  if (runPerformance) {
    runPerformanceTest();
  }

  if (runLoad) {
    runLoadTest();
  }

  if (runUnit) {
    runUnitTests();
  }

  const report = generateReport();
  printSummary(report);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runPerformanceTest, runLoadTest, runUnitTests };
