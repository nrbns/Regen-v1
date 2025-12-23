/**
 * Stability Tests - Run for extended periods to check for crashes/memory leaks
 */

export interface StabilityMetrics {
  startTime: number;
  duration: number;
  crashes: number;
  memoryLeaks: number[];
  errorCount: number;
  tabCount: number[];
  cpuUsage: number[];
}

let stabilityTestRunning = false;
let stabilityMetrics: StabilityMetrics = {
  startTime: 0,
  duration: 0,
  crashes: 0,
  memoryLeaks: [],
  errorCount: 0,
  tabCount: [],
  cpuUsage: [],
};

// Store cleanup handlers
let activeIntervals: Array<NodeJS.Timeout> = [];
let activeTimeout: NodeJS.Timeout | null = null;

/**
 * Start stability test (run for specified duration)
 */
export function startStabilityTest(durationMinutes: number = 60): void {
  if (stabilityTestRunning) {
    console.warn('[StabilityTest] Test already running');
    return;
  }

  stabilityTestRunning = true;
  stabilityMetrics = {
    startTime: Date.now(),
    duration: durationMinutes * 60 * 1000,
    crashes: 0,
    memoryLeaks: [],
    errorCount: 0,
    tabCount: [],
    cpuUsage: [],
  };

  console.log(`[StabilityTest] Starting ${durationMinutes}-minute stability test`);

  // Monitor memory every 5 minutes
  const memoryInterval = setInterval(() => {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      const usedMB = memInfo.usedJSHeapSize / 1048576;
      stabilityMetrics.memoryLeaks.push(usedMB);
      
      // Check for memory leak (continuous growth)
      if (stabilityMetrics.memoryLeaks.length > 2) {
        const recent = stabilityMetrics.memoryLeaks.slice(-3);
        const growth = recent[recent.length - 1] - recent[0];
        if (growth > 100) { // 100MB growth in 15 minutes
          console.warn('[StabilityTest] Potential memory leak detected:', growth, 'MB');
        }
      }
    }
  }, 5 * 60 * 1000);

  // Monitor tab count
  const tabInterval = setInterval(() => {
    if (typeof window !== 'undefined' && (window as any).useTabsStore) {
      const tabs = (window as any).useTabsStore?.getState?.()?.tabs || [];
      stabilityMetrics.tabCount.push(tabs.length);
    }
  }, 60000); // Every minute

  // Store intervals for cleanup
  activeIntervals = [memoryInterval, tabInterval];

  // Stop test after duration
  activeTimeout = setTimeout(() => {
    stopStabilityTest();
  }, durationMinutes * 60 * 1000);
}

/**
 * Get current stability test metrics
 */
export function getStabilityMetrics(): StabilityMetrics {
  return { ...stabilityMetrics };
}

/**
 * Stop stability test and cleanup resources
 */
export function stopStabilityTest(): void {
  if (!stabilityTestRunning) {
    return;
  }

  // Clean up all intervals
  activeIntervals.forEach(interval => clearInterval(interval));
  activeIntervals = [];

  // Clean up timeout
  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }

  stabilityTestRunning = false;
  stabilityMetrics.duration = Date.now() - stabilityMetrics.startTime;
  console.log('[StabilityTest] Test stopped:', stabilityMetrics);
  
  // Report results
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('stability-test-complete', { detail: stabilityMetrics })
    );
  }
}

/**
 * Record a crash/error during stability test
 */
export function recordStabilityError(): void {
  stabilityMetrics.errorCount++;
  if (stabilityTestRunning) {
    console.warn(`[StabilityTest] Error recorded (total: ${stabilityMetrics.errorCount})`);
  }
}

/**
 * Check if stability test is running
 */
export function isStabilityTestRunning(): boolean {
  return stabilityTestRunning;
}

