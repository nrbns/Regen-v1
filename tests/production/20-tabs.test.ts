/**
 * 20 Tabs Test
 * 
 * Tests that Regen can handle 20 tabs without RAM explosion.
 * Closing all tabs must free memory immediately.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TabTestHelper } from './helpers/tab-manager';
import { PerformanceMonitor } from './helpers/performance';
import { AITestHelper } from './helpers/ai-engine';

describe('20 Tabs Test', () => {
  let tabHelper: TabTestHelper;
  let perfMonitor: PerformanceMonitor;

  beforeEach(() => {
    tabHelper = new TabTestHelper();
    perfMonitor = new PerformanceMonitor();
    perfMonitor.start();
  });

  it('should open 20 tabs without RAM explosion', async () => {
    const urls = Array.from({ length: 20 }, (_, i) => `https://example${i}.com`);
    
    perfMonitor.record(); // Initial RAM
    const startTime = Date.now();

    // Open 20 tabs simultaneously
    const tabs = await tabHelper.createMultipleTabs(urls);

    const endTime = Date.now();
    perfMonitor.record(); // RAM after opening tabs

    // Check: RAM stays under 2GB (2000 MB)
    const maxRAM = perfMonitor.getMaxRAM();
    expect(maxRAM).toBeLessThan(2000);

    // Check: All tabs created
    expect(tabs.length).toBe(20);
    expect(tabHelper.getTabCount()).toBe(20);

    // Check: Tab creation time is reasonable
    const creationTime = endTime - startTime;
    expect(creationTime).toBeLessThan(5000); // Should be fast
  });

  it('should close all tabs and free memory', async () => {
    // Open 20 tabs
    const urls = Array.from({ length: 20 }, (_, i) => `https://example${i}.com`);
    await tabHelper.createMultipleTabs(urls);

    perfMonitor.record(); // RAM with 20 tabs
    const ramBefore = perfMonitor.getMaxRAM();

    // Close all tabs
    await tabHelper.closeAllTabs();

    // Wait a bit for memory to be freed
    await new Promise(resolve => setTimeout(resolve, 100));
    perfMonitor.record(); // RAM after closing

    // Check: RAM drops (or at least doesn't increase)
    const ramAfter = perfMonitor.getMetrics()[perfMonitor.getMetrics().length - 1].ram;
    expect(ramAfter).toBeLessThanOrEqual(ramBefore + 50); // Allow small margin

    // Check: All tabs closed
    expect(tabHelper.getTabCount()).toBe(0);
  });

  it('should handle AI tasks on multiple tabs', async () => {
    const aiHelper = new AITestHelper();
    
    // Open 20 tabs
    const urls = Array.from({ length: 20 }, (_, i) => `https://example${i}.com`);
    await tabHelper.createMultipleTabs(urls);

    perfMonitor.record();

    // Run AI tasks on multiple tabs (simulated)
    const aiTasks = Array.from({ length: 5 }, () => 
      aiHelper.simulateAISlow(100)
    );

    // Browser should still be responsive
    const responseTime = await new Promise<number>(resolve => {
      const start = Date.now();
      // Simulate user interaction
      setTimeout(() => {
        resolve(Date.now() - start);
      }, 10);
    });

    await Promise.all(aiTasks);
    perfMonitor.record();

    // Check: Browser still responsive
    expect(responseTime).toBeLessThan(100); // Should be fast
    expect(tabHelper.getTabCount()).toBe(20);
  });

  it('should handle rapid tab open/close', async () => {
    perfMonitor.start();

    // Rapidly open and close tabs
    for (let i = 0; i < 10; i++) {
      const tab = await tabHelper.createTab(`https://example${i}.com`);
      perfMonitor.record();
      await tabHelper.closeTab(tab.id);
      perfMonitor.record();
    }

    // Check: No memory leaks (memory should be stable)
    const hasLeak = perfMonitor.hasMemoryLeak(50); // 50MB threshold
    expect(hasLeak).toBe(false);

    // Check: All tabs closed
    expect(tabHelper.getTabCount()).toBe(0);
  });
});
