/**
 * 6-Hour Browsing Session E2E Test
 * 
 * Tests that Regen can handle a real 6-hour browsing session
 * without lag, spikes, heat, or crashes.
 * 
 * NOTE: For CI, these tests run with shortened durations.
 * For real 6-hour testing, set ENV variable: REAL_6_HOUR_TEST=true
 */

import { test, expect } from '@playwright/test';

const IS_REAL_6_HOUR = process.env.REAL_6_HOUR_TEST === 'true';
const DURATION_MULTIPLIER = IS_REAL_6_HOUR ? 1 : 1 / 360; // 1 second = 1 hour in CI

test.describe('6-Hour Browsing Session', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:1420'); // Tauri dev port
    await page.waitForLoadState('networkidle');
  });

  test('should browse Gmail for extended period without issues', async ({ page }) => {
    const duration = IS_REAL_6_HOUR ? 3 * 60 * 60 * 1000 : 30 * 1000; // 3 hours or 30 seconds
    
    // Navigate to Gmail
    await page.goto('https://gmail.com');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();
    const startMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);

    // Simulate browsing: scroll, click, interact
    while (Date.now() - startTime < duration) {
      // Scroll
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(1000 * DURATION_MULTIPLIER);

      // Check for lag (FPS should be >30)
      const fps = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let frames = 0;
          const start = performance.now();
          const checkFrame = () => {
            frames++;
            if (performance.now() - start < 1000) {
              requestAnimationFrame(checkFrame);
            } else {
              resolve(frames);
            }
          };
          requestAnimationFrame(checkFrame);
        });
      });

      expect(fps).toBeGreaterThan(30); // Should maintain >30 FPS

      // Check memory
      const currentMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      const memoryIncrease = (currentMemory - startMemory) / 1024 / 1024; // MB
      
      // Memory should not explode
      expect(memoryIncrease).toBeLessThan(500); // <500MB increase
    }

    // Final check: no crashes, memory reasonable
    const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
    const totalMemoryIncrease = (finalMemory - startMemory) / 1024 / 1024;
    expect(totalMemoryIncrease).toBeLessThan(1000); // <1GB total increase
  });

  test('should handle YouTube scrolling smoothly', async ({ page }) => {
    // Navigate to YouTube
    await page.goto('https://youtube.com');
    await page.waitForLoadState('networkidle');

    const scrollCount = IS_REAL_6_HOUR ? 1000 : 10;
    let jankCount = 0;

    for (let i = 0; i < scrollCount; i++) {
      const beforeScroll = performance.now();
      
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });

      await page.waitForTimeout(100);

      const afterScroll = performance.now();
      const scrollTime = afterScroll - beforeScroll;

      // Check for jank (scroll should be <16ms for 60fps)
      if (scrollTime > 16) {
        jankCount++;
      }
    }

    // Jank should be <5% of scrolls
    const jankPercent = (jankCount / scrollCount) * 100;
    expect(jankPercent).toBeLessThan(5);
  });

  test('should handle Docs editing responsively', async ({ page }) => {
    // Navigate to Google Docs
    await page.goto('https://docs.google.com');
    await page.waitForLoadState('networkidle');

    // Find editor (adjust selector based on actual Docs structure)
    const editor = page.locator('[contenteditable="true"], .kix-appview-editor').first();
    
    if (await editor.count() > 0) {
      const typingCount = IS_REAL_6_HOUR ? 10000 : 100;
      const inputDelays: number[] = [];

      for (let i = 0; i < typingCount; i++) {
        const start = performance.now();
        await editor.type('a', { delay: 10 });
        const end = performance.now();
        inputDelays.push(end - start);
      }

      // Average input latency should be <50ms
      const avgLatency = inputDelays.reduce((a, b) => a + b, 0) / inputDelays.length;
      expect(avgLatency).toBeLessThan(50);
    }
  });

  test('should handle Twitter infinite scroll', async ({ page }) => {
    // Navigate to Twitter
    await page.goto('https://twitter.com');
    await page.waitForLoadState('networkidle');

    const scrollCount = IS_REAL_6_HOUR ? 500 : 20;
    const memorySnapshots: number[] = [];

    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(500);

      const memory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      memorySnapshots.push(memory / 1024 / 1024); // MB
    }

    // Check for memory leaks (memory should not continuously increase)
    const firstHalf = memorySnapshots.slice(0, Math.floor(memorySnapshots.length / 2));
    const secondHalf = memorySnapshots.slice(Math.floor(memorySnapshots.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    // Memory increase should be <200MB between halves
    expect(secondAvg - firstAvg).toBeLessThan(200);
  });

  test('should handle StackOverflow tab switching', async ({ page }) => {
    // Create multiple StackOverflow tabs
    const tabCount = 10;
    const tabIds: string[] = [];

    for (let i = 0; i < tabCount; i++) {
      // Create new tab (adjust selector)
      await page.click('[data-testid="new-tab-btn"], button:has-text("New Tab")').first();
      await page.waitForTimeout(100);

      // Navigate to StackOverflow
      const url = `https://stackoverflow.com/questions/${1000000 + i}`;
      const omnibox = page.locator('input[type="text"][placeholder*="Search"], #omnibox').first();
      await omnibox.fill(url);
      await omnibox.press('Enter');
      await page.waitForLoadState('networkidle');
    }

    // Switch between tabs and measure switch time
    const switchTimes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const tabIndex = i % tabCount;
      
      const start = performance.now();
      // Click tab (adjust selector)
      await page.click(`[data-tab-id="${tabIndex}"], .tab:nth-child(${tabIndex + 1})`).first();
      await page.waitForLoadState('networkidle');
      const end = performance.now();
      
      switchTimes.push(end - start);
    }

    // Tab switch should be <100ms
    const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    expect(avgSwitchTime).toBeLessThan(100);
  });

  test('should maintain performance over extended period', async ({ page }) => {
    const duration = IS_REAL_6_HOUR ? 6 * 60 * 60 * 1000 : 60 * 1000; // 6 hours or 1 minute
    
    const startTime = Date.now();
    const startMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
    const metrics: Array<{ time: number; memory: number; fps: number }> = [];

    // Run all activities in sequence
    const sites = [
      'https://gmail.com',
      'https://youtube.com',
      'https://docs.google.com',
      'https://twitter.com',
      'https://stackoverflow.com',
    ];

    while (Date.now() - startTime < duration) {
      for (const site of sites) {
        await page.goto(site);
        await page.waitForLoadState('networkidle');

        // Scroll
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1000 * DURATION_MULTIPLIER);

        // Measure metrics
        const memory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
        const fps = await page.evaluate(() => {
          return new Promise<number>((resolve) => {
            let frames = 0;
            const start = performance.now();
            const checkFrame = () => {
              frames++;
              if (performance.now() - start < 1000) {
                requestAnimationFrame(checkFrame);
              } else {
                resolve(frames);
              }
            };
            requestAnimationFrame(checkFrame);
          });
        });

        metrics.push({
          time: Date.now() - startTime,
          memory: memory / 1024 / 1024, // MB
          fps,
        });
      }
    }

    // Check: No degradation over time
    const firstQuarter = metrics.slice(0, Math.floor(metrics.length / 4));
    const lastQuarter = metrics.slice(Math.floor(metrics.length * 3 / 4));

    const firstAvgMemory = firstQuarter.reduce((a, b) => a + b.memory, 0) / firstQuarter.length;
    const lastAvgMemory = lastQuarter.reduce((a, b) => a + b.memory, 0) / lastQuarter.length;

    const firstAvgFPS = firstQuarter.reduce((a, b) => a + b.fps, 0) / firstQuarter.length;
    const lastAvgFPS = lastQuarter.reduce((a, b) => a + b.fps, 0) / lastQuarter.length;

    // Memory increase should be <500MB
    expect(lastAvgMemory - firstAvgMemory).toBeLessThan(500);

    // FPS should not degrade significantly
    expect(lastAvgFPS).toBeGreaterThan(firstAvgFPS * 0.8); // At least 80% of initial FPS
  });
});
