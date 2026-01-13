/**
 * 6-Hour Browsing Session Test
 * 
 * Tests that Regen can handle a real 6-hour browsing session
 * without lag, spikes, heat, or crashes.
 * 
 * NOTE: Unit test version - for browser automation tests,
 * see: tests/production/6-hour-session.e2e.spec.ts
 * 
 * Run E2E tests with: npm run test:playwright -- tests/production/6-hour-session.e2e.spec.ts
 * For real 6-hour test: REAL_6_HOUR_TEST=true npm run test:playwright -- tests/production/6-hour-session.e2e.spec.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PerformanceMonitor } from './helpers/performance';
import { TabTestHelper } from './helpers/tab-manager';

describe('6-Hour Browsing Session (Unit Tests)', () => {
  const TEST_SITES = [
    'https://gmail.com',
    'https://youtube.com',
    'https://docs.google.com',
    'https://twitter.com',
    'https://stackoverflow.com',
  ];

  let perfMonitor: PerformanceMonitor;
  let tabHelper: TabTestHelper;

  beforeAll(() => {
    perfMonitor = new PerformanceMonitor();
    perfMonitor.start();
    tabHelper = new TabTestHelper();
    console.log('[6-Hour Test] Starting test session...');
  });

  afterAll(() => {
    // Cleanup: Verify memory is freed
    const hasLeak = perfMonitor.hasMemoryLeak(100);
    expect(hasLeak).toBe(false);
    console.log('[6-Hour Test] Test session complete');
  });

  it('should simulate extended browsing session', async () => {
    // Simulate extended session (shortened for unit test)
    for (const site of TEST_SITES) {
      const tab = await tabHelper.createTab(site);
      perfMonitor.record();
      
      // Simulate activity
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await tabHelper.closeTab(tab.id);
      perfMonitor.record();
    }

    // Check: No memory leaks
    const hasLeak = perfMonitor.hasMemoryLeak(50);
    expect(hasLeak).toBe(false);
  });

  it('should handle multiple site browsing', async () => {
    // Create tabs for all test sites
    const tabs = await tabHelper.createMultipleTabs(TEST_SITES);
    perfMonitor.record();

    // Check: All tabs created
    expect(tabs.length).toBe(TEST_SITES.length);
    expect(tabHelper.getTabCount()).toBe(TEST_SITES.length);

    // Check: RAM manageable
    const maxRAM = perfMonitor.getMaxRAM();
    expect(maxRAM).toBeLessThan(2000); // <2GB

    // Close all
    await tabHelper.closeAllTabs();
    perfMonitor.record();
  });

  it('should maintain performance over extended operations', async () => {
    perfMonitor.start();

    // Simulate extended operations
    for (let i = 0; i < 50; i++) {
      const tab = await tabHelper.createTab(`https://example${i}.com`);
      perfMonitor.record();
      await new Promise(resolve => setTimeout(resolve, 10));
      await tabHelper.closeTab(tab.id);
      perfMonitor.record();
    }

    // Check: No memory leaks
    const hasLeak = perfMonitor.hasMemoryLeak(100);
    expect(hasLeak).toBe(false);

    // Check: Memory stable
    const metrics = perfMonitor.getMetrics();
    if (metrics.length > 10) {
      const first = metrics.slice(0, 10);
      const last = metrics.slice(-10);
      const firstAvg = first.reduce((a, b) => a + b.ram, 0) / first.length;
      const lastAvg = last.reduce((a, b) => a + b.ram, 0) / last.length;
      expect(lastAvg - firstAvg).toBeLessThan(200); // <200MB increase
    }
  });
});
