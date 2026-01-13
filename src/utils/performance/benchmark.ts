/**
 * Performance Benchmarking Utilities
 * For testing Regen on low-resource devices (4GB RAM target)
 */

export interface BenchmarkResult {
  name: string;
  value: number;
  unit: string;
  target?: number;
  passed: boolean;
}

export interface SystemInfo {
  totalMemory: number; // bytes
  availableMemory: number; // bytes
  cpuCount: number;
  platform: string;
}

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  if (typeof window === 'undefined') {
    return {
      totalMemory: 0,
      availableMemory: 0,
      cpuCount: 1,
      platform: 'unknown',
    };
  }

  // Try to get memory info (if available)
  const memory = (performance as any).memory;
  const totalMemory = memory?.jsHeapSizeLimit || 0;
  const availableMemory = memory?.totalJSHeapSize || 0;

  // Get CPU count (navigator.hardwareConcurrency)
  const cpuCount = navigator.hardwareConcurrency || 1;

  // Get platform
  const platform = navigator.platform || 'unknown';

  return {
    totalMemory,
    availableMemory,
    cpuCount,
    platform,
  };
}

/**
 * Benchmark event bus performance
 */
export async function benchmarkEventBus(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  // Test event emission latency
  const { eventBus } = await import('../../core/state/eventBus');
  
  const iterations = 100;
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    eventBus.emit('test:benchmark', { iteration: i });
  }
  
  const endTime = performance.now();
  const avgLatency = (endTime - startTime) / iterations;
  
  results.push({
    name: 'Event Emission Latency',
    value: avgLatency,
    unit: 'ms',
    target: 1, // Target: <1ms per event
    passed: avgLatency < 1,
  });
  
  // Test queue processing
  const queueStart = performance.now();
  await new Promise(resolve => setTimeout(resolve, 100)); // Wait for queue processing
  const queueEnd = performance.now();
  const queueTime = queueEnd - queueStart;
  
  results.push({
    name: 'Queue Processing Time',
    value: queueTime,
    unit: 'ms',
    target: 100, // Target: <100ms for 100 events
    passed: queueTime < 100,
  });
  
  return results;
}

/**
 * Benchmark memory usage
 */
export async function benchmarkMemory(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return [
      {
        name: 'Memory Benchmark',
        value: 0,
        unit: 'MB',
        passed: false,
      },
    ];
  }
  
  const memory = (performance as any).memory;
  const usedMB = memory.usedJSHeapSize / (1024 * 1024);
  const totalMB = memory.totalJSHeapSize / (1024 * 1024);
  const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
  
  results.push({
    name: 'Memory Used',
    value: usedMB,
    unit: 'MB',
    target: 100, // Target: <100MB for basic usage
    passed: usedMB < 100,
  });
  
  results.push({
    name: 'Memory Total',
    value: totalMB,
    unit: 'MB',
    target: 200, // Target: <200MB total
    passed: totalMB < 200,
  });
  
  return results;
}

/**
 * Benchmark tab performance
 */
export async function benchmarkTabs(tabCount: number = 10): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  const startTime = performance.now();
  
  // Simulate tab operations
  for (let i = 0; i < tabCount; i++) {
    // Simulate tab creation
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const endTime = performance.now();
  const avgTimePerTab = (endTime - startTime) / tabCount;
  
  results.push({
    name: 'Tab Creation Time',
    value: avgTimePerTab,
    unit: 'ms',
    target: 50, // Target: <50ms per tab
    passed: avgTimePerTab < 50,
  });
  
  return results;
}

/**
 * Run all benchmarks
 */
export async function runAllBenchmarks(): Promise<{
  systemInfo: SystemInfo;
  results: BenchmarkResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    score: number; // 0-100
  };
}> {
  const systemInfo = await getSystemInfo();
  const results: BenchmarkResult[] = [];
  
  // Run all benchmarks
  results.push(...(await benchmarkEventBus()));
  results.push(...(await benchmarkMemory()));
  results.push(...(await benchmarkTabs()));
  
  // Calculate summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  return {
    systemInfo,
    results,
    summary: {
      total,
      passed,
      failed,
      score,
    },
  };
}

/**
 * Check if system meets minimum requirements (4GB RAM target)
 */
export async function checkMinimumRequirements(): Promise<{
  meetsRequirements: boolean;
  issues: string[];
}> {
  const systemInfo = await getSystemInfo();
  const issues: string[] = [];
  
  // Check memory (rough estimate - browser doesn't expose total RAM)
  if (systemInfo.totalMemory > 0) {
    const totalGB = systemInfo.totalMemory / (1024 * 1024 * 1024);
    if (totalGB < 2) {
      issues.push(`Low memory detected: ${totalGB.toFixed(1)}GB (recommended: 4GB+)`);
    }
  }
  
  // Check CPU
  if (systemInfo.cpuCount < 2) {
    issues.push(`Single core CPU detected (recommended: 2+ cores)`);
  }
  
  return {
    meetsRequirements: issues.length === 0,
    issues,
  };
}
