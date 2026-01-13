/**
 * Stress Test Runner
 * 
 * Provides UI and CLI interface for running stress tests
 */

import { runEventBusStressTest, quickStressTest, fullStressTest, type StressTestResults } from './eventBusStressTest';

export interface StressTestReport {
  timestamp: number;
  config: Parameters<typeof runEventBusStressTest>[0];
  results: StressTestResults;
  passed: boolean;
  recommendations: string[];
}

/**
 * Run stress test and generate report
 */
export async function runStressTestWithReport(
  config: Parameters<typeof runEventBusStressTest>[0] = {}
): Promise<StressTestReport> {
  const results = await runEventBusStressTest(config);
  const recommendations: string[] = [];

  // Analyze results and generate recommendations
  if (results.crashes > 0) {
    recommendations.push(`❌ CRITICAL: ${results.crashes} crash(es) detected. Event bus is unstable under load.`);
  }

  if (results.errors.length > 10) {
    recommendations.push(`⚠️ WARNING: ${results.errors.length} errors detected. Review error handling.`);
  }

  if (results.avgEventLatency && results.avgEventLatency > 50) {
    recommendations.push(`⚠️ WARNING: High average event latency (${results.avgEventLatency.toFixed(2)}ms). Consider optimizing event handlers.`);
  }

  if (results.maxMemoryMB && results.maxMemoryMB > 500) {
    recommendations.push(`⚠️ WARNING: High memory usage (${results.maxMemoryMB.toFixed(2)}MB). Check for memory leaks.`);
  }

  // Check event distribution
  const totalEvents = results.totalEvents;
  const eventTypes = Object.keys(results.eventsByType);
  if (eventTypes.length === 0) {
    recommendations.push(`❌ CRITICAL: No events were emitted. Event bus may not be working.`);
  }

  // Check if any event type dominates (potential bottleneck)
  for (const [type, count] of Object.entries(results.eventsByType)) {
    const percentage = (count / totalEvents) * 100;
    if (percentage > 80) {
      recommendations.push(`⚠️ INFO: Event type "${type}" accounts for ${percentage.toFixed(1)}% of all events. Consider load balancing.`);
    }
  }

  const passed = results.crashes === 0 && results.errors.length < 10;

  return {
    timestamp: Date.now(),
    config,
    results,
    passed,
    recommendations,
  };
}

/**
 * Run quick test (for development)
 */
export async function runQuickTest(): Promise<StressTestReport> {
  return runStressTestWithReport({
    tabs: 20,
    duration: 10000,
    eventsPerSecond: 50,
    rapidScroll: true,
    rapidSearch: true,
    concurrentAutomations: false,
  });
}

/**
 * Run full test (for production readiness)
 */
export async function runFullTest(): Promise<StressTestReport> {
  return runStressTestWithReport({
    tabs: 50,
    duration: 60000,
    eventsPerSecond: 100,
    rapidScroll: true,
    rapidSearch: true,
    concurrentAutomations: true,
  });
}

/**
 * Print report to console
 */
export function printReport(report: StressTestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 STRESS TEST REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('\n📈 Results:');
  console.log(`  Total Events: ${report.results.totalEvents}`);
  console.log(`  Crashes: ${report.results.crashes}`);
  console.log(`  Errors: ${report.results.errors.length}`);
  console.log(`  Max Memory: ${report.results.maxMemoryMB?.toFixed(2) || 'N/A'} MB`);
  console.log(`  Avg Latency: ${report.results.avgEventLatency?.toFixed(2) || 'N/A'} ms`);
  console.log('\n📊 Events by Type:');
  for (const [type, count] of Object.entries(report.results.eventsByType)) {
    console.log(`  ${type}: ${count}`);
  }
  if (report.results.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.results.errors.slice(0, 10).forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    if (report.results.errors.length > 10) {
      console.log(`  ... and ${report.results.errors.length - 10} more`);
    }
  }
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec) => console.log(`  ${rec}`));
  }
  console.log('='.repeat(60) + '\n');
}

// Export for use in browser console or CLI
if (typeof window !== 'undefined') {
  (window as any).runStressTest = runStressTestWithReport;
  (window as any).runQuickStressTest = runQuickTest;
  (window as any).runFullStressTest = runFullTest;
  (window as any).printStressTestReport = printReport;
  console.log('[StressTest] Available in console: runQuickStressTest(), runFullStressTest()');
}
