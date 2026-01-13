/**
 * Event Bus Stress Test
 * 
 * Simulates high-load scenarios to verify event bus stability:
 * - 50+ tabs opening/closing
 * - Rapid scroll events
 * - Rapid search events
 * - Concurrent automation triggers
 * 
 * Usage:
 *   import { runEventBusStressTest } from './core/testing/eventBusStressTest';
 *   runEventBusStressTest({ tabs: 50, duration: 60000 });
 */

import { regenEventBus } from '../events/eventBus';
import { automationEngine } from '../automation/engine';

export interface StressTestConfig {
  /** Number of tabs to simulate */
  tabs?: number;
  /** Test duration in milliseconds */
  duration?: number;
  /** Events per second to emit */
  eventsPerSecond?: number;
  /** Enable rapid scroll simulation */
  rapidScroll?: boolean;
  /** Enable rapid search simulation */
  rapidSearch?: boolean;
  /** Enable concurrent automation triggers */
  concurrentAutomations?: boolean;
}

export interface StressTestResults {
  totalEvents: number;
  eventsByType: Record<string, number>;
  errors: string[];
  crashes: number;
  maxMemoryMB?: number;
  avgEventLatency?: number;
  warnings: string[];
}

/**
 * Run comprehensive stress test on event bus
 */
export async function runEventBusStressTest(
  config: StressTestConfig = {}
): Promise<StressTestResults> {
  const {
    tabs = 50,
    duration = 60000, // 1 minute default
    eventsPerSecond = 100,
    rapidScroll = true,
    rapidSearch = true,
    concurrentAutomations = true,
  } = config;

  console.log('[StressTest] Starting event bus stress test...', {
    tabs,
    duration,
    eventsPerSecond,
    rapidScroll,
    rapidSearch,
    concurrentAutomations,
  });

  const results: StressTestResults = {
    totalEvents: 0,
    eventsByType: {},
    errors: [],
    crashes: 0,
    warnings: [],
  };

  const startTime = Date.now();
  const endTime = startTime + duration;
  const eventInterval = 1000 / eventsPerSecond;
  let eventCount = 0;
  const eventLatencies: number[] = [];

  // Track memory usage
  let maxMemoryMB = 0;
  const memoryCheckInterval = setInterval(() => {
    if (performance.memory) {
      const currentMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      if (currentMB > maxMemoryMB) {
        maxMemoryMB = currentMB;
      }
    }
  }, 1000);

  // Error handler to catch crashes
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    results.crashes++;
    results.errors.push(`Crash: ${message} at ${source}:${lineno}:${colno}`);
    console.error('[StressTest] Crash detected:', message, error);
    return false; // Don't prevent default error handling
  };

  // Event listener to track all events
  const eventTracker = regenEventBus.subscribe((event) => {
    const eventTime = Date.now();
    const latency = eventTime - startTime;
    eventLatencies.push(latency);

    results.totalEvents++;
    const eventType = event.type;
    results.eventsByType[eventType] = (results.eventsByType[eventType] || 0) + 1;

    // Warn if event processing is slow
    if (eventLatencies.length > 1) {
      const avgLatency = eventLatencies.reduce((a, b) => a + b, 0) / eventLatencies.length;
      if (avgLatency > 100) {
        results.warnings.push(`High event latency: ${avgLatency.toFixed(2)}ms`);
      }
    }
  });

  // Simulate tab operations
  const simulateTabs = async () => {
    const tabIds: string[] = [];
    let tabCounter = 0;

    while (Date.now() < endTime) {
      // Open new tab
      if (tabIds.length < tabs) {
        const tabId = `stress-tab-${tabCounter++}`;
        const url = `https://example.com/page-${tabCounter}`;
        tabIds.push(tabId);

        regenEventBus.emit({
          type: 'TAB_OPEN',
          payload: { tabId, url },
        });

        // Simulate URL change
        setTimeout(() => {
          regenEventBus.emit({
            type: 'URL_CHANGE',
            payload: url,
          });
        }, Math.random() * 100);
      }

      // Randomly close a tab
      if (tabIds.length > 0 && Math.random() > 0.7) {
        const index = Math.floor(Math.random() * tabIds.length);
        const tabId = tabIds.splice(index, 1)[0];
        regenEventBus.emit({
          type: 'TAB_CLOSE',
          payload: { tabId },
        });
      }

      await new Promise((resolve) => setTimeout(resolve, eventInterval));
    }
  };

  // Simulate rapid scrolling
  const simulateRapidScroll = async () => {
    while (Date.now() < endTime) {
      const depth = Math.random();
      regenEventBus.emit({
        type: 'SCROLL_END',
        payload: { depth, url: window.location.href },
      });
      await new Promise((resolve) => setTimeout(resolve, 50)); // 20 scrolls/second
    }
  };

  // Simulate rapid searches
  const simulateRapidSearch = async () => {
    const searchQueries = [
      'test query',
      'stress test',
      'event bus',
      'rapid search',
      'performance',
    ];
    let queryIndex = 0;

    while (Date.now() < endTime) {
      regenEventBus.emit({
        type: 'COMMAND',
        payload: `search ${searchQueries[queryIndex % searchQueries.length]}`,
      });
      queryIndex++;
      await new Promise((resolve) => setTimeout(resolve, 100)); // 10 searches/second
    }
  };

  // Simulate concurrent automations
  const simulateConcurrentAutomations = async () => {
    while (Date.now() < endTime) {
      // Randomly trigger automations
      if (Math.random() > 0.8) {
        try {
          await automationEngine.executeAction(
            'SUMMARIZE_AND_SAVE',
            { url: `https://example.com/page-${Math.floor(Math.random() * 100)}` },
            'stress-test-rule'
          );
        } catch (error) {
          results.errors.push(`Automation error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  // Run all simulations concurrently
  const simulations = [
    simulateTabs(),
    ...(rapidScroll ? [simulateRapidScroll()] : []),
    ...(rapidSearch ? [simulateRapidSearch()] : []),
    ...(concurrentAutomations ? [simulateConcurrentAutomations()] : []),
  ];

  try {
    await Promise.all(simulations);
  } catch (error) {
    results.errors.push(`Simulation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Cleanup
  clearInterval(memoryCheckInterval);
  eventTracker(); // Unsubscribe
  window.onerror = originalErrorHandler;

  // Calculate results
  results.maxMemoryMB = maxMemoryMB;
  if (eventLatencies.length > 0) {
    results.avgEventLatency =
      eventLatencies.reduce((a, b) => a + b, 0) / eventLatencies.length;
  }

  const actualDuration = Date.now() - startTime;
  const eventsPerSecondActual = (results.totalEvents / actualDuration) * 1000;

  console.log('[StressTest] Test completed:', {
    duration: `${actualDuration}ms`,
    totalEvents: results.totalEvents,
    eventsPerSecond: eventsPerSecondActual.toFixed(2),
    eventsByType: results.eventsByType,
    crashes: results.crashes,
    errors: results.errors.length,
    maxMemoryMB: results.maxMemoryMB?.toFixed(2),
    avgEventLatency: results.avgEventLatency?.toFixed(2),
  });

  return results;
}

/**
 * Quick stress test (10 seconds, 20 tabs)
 */
export async function quickStressTest(): Promise<StressTestResults> {
  return runEventBusStressTest({
    tabs: 20,
    duration: 10000,
    eventsPerSecond: 50,
    rapidScroll: true,
    rapidSearch: true,
    concurrentAutomations: false,
  });
}

/**
 * Full stress test (1 minute, 50 tabs, all features)
 */
export async function fullStressTest(): Promise<StressTestResults> {
  return runEventBusStressTest({
    tabs: 50,
    duration: 60000,
    eventsPerSecond: 100,
    rapidScroll: true,
    rapidSearch: true,
    concurrentAutomations: true,
  });
}
