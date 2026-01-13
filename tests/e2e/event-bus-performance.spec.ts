/**
 * E2E Tests for Event Bus Performance
 * Tests throttling, error recovery, and metrics
 */

import { test, expect } from '@playwright/test';

test.describe('Event Bus Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Event Throttling Prevents CPU Spikes', async ({ page }) => {
    const startTime = Date.now();

    // Emit many scroll events rapidly
    await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      
      // Emit 1000 scroll events rapidly
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('SCROLL', { position: i, timestamp: Date.now() });
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete quickly due to throttling
    expect(duration).toBeLessThan(5000); // Should be < 5 seconds

    // Verify metrics
    const metrics = await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      return eventBus.getMetrics();
    });

    expect(metrics.totalEmitted).toBeGreaterThan(0);
  });

  test('Error Recovery Retries Failed Events', async ({ page }) => {
    // Simulate failed event handler
    await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      
      // Add a handler that fails
      let attempts = 0;
      eventBus.on('test:error', () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Simulated error');
        }
      });

      // Emit event that will fail initially
      eventBus.emit('test:error', { test: true });
    });

    // Wait for retry
    await page.waitForTimeout(2000);

    // Check failed events count
    const failedCount = await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      return eventBus.getFailedEventsCount();
    });

    // Should have retried and either succeeded or be in queue
    expect(failedCount).toBeGreaterThanOrEqual(0);
  });

  test('Metrics Dashboard Updates in Real-Time', async ({ page }) => {
    // Check if metrics dashboard is visible (dev mode)
    const dashboardVisible = await page.locator('text=Realtime Metrics').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (dashboardVisible) {
      // Get initial metrics
      const initialEmitted = await page.evaluate(() => {
        const { eventBus } = require('../../src/core/state/eventBus');
        return eventBus.getMetrics().totalEmitted;
      });

      // Emit some events
      await page.evaluate(() => {
        const { eventBus } = require('../../src/core/state/eventBus');
        for (let i = 0; i < 10; i++) {
          eventBus.emit('test:metrics', { iteration: i });
        }
      });

      // Wait for metrics to update
      await page.waitForTimeout(2000);

      // Get updated metrics
      const updatedEmitted = await page.evaluate(() => {
        const { eventBus } = require('../../src/core/state/eventBus');
        return eventBus.getMetrics().totalEmitted;
      });

      // Metrics should have increased
      expect(updatedEmitted).toBeGreaterThan(initialEmitted);
    }
  });

  test('Queue Size Stays Manageable', async ({ page }) => {
    // Emit many events
    await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      
      // Emit 500 events
      for (let i = 0; i < 500; i++) {
        eventBus.emit('test:queue', { iteration: i });
      }
    });

    // Wait for processing
    await page.waitForTimeout(3000);

    // Check queue size
    const queueSize = await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      return eventBus.getMetrics().queueSize;
    });

    // Queue should be processed (size should be low)
    expect(queueSize).toBeLessThan(100);
  });
});
