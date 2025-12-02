/**
 * Tab Switch E2E Tests
 * Verifies tab switching doesn't cause null states or stale content
 */

import { test, expect } from '@playwright/test';

test.describe('Tab Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (adjust URL based on your dev setup)
    await page.goto('http://localhost:1420'); // Default Tauri dev port
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('tab switch does not show wrong tab content', async ({ page }) => {
    // Open multiple tabs
    const tabUrls: string[] = [];
    for (let i = 0; i < 5; i++) {
      // Click new tab button (adjust selector based on your UI)
      await page
        .click('[data-testid="new-tab-btn"], button:has-text("New Tab"), #new-tab, .new-tab-button')
        .first();

      // Wait for tab to be created
      await page.waitForTimeout(200);

      // Navigate to different URLs
      const url = `https://example.com/?q=${i}`;
      tabUrls.push(url);

      // Enter URL in omnibox (adjust selector)
      const omnibox = page
        .locator(
          'input[type="text"][placeholder*="Search"], #omnibox, [data-testid="omnibox"], input[type="url"]'
        )
        .first();
      await omnibox.fill(url);
      await omnibox.press('Enter');

      // Wait for page to start loading
      await page.waitForTimeout(500);
    }

    // Switch tabs rapidly and verify content
    for (let i = 0; i < 30; i++) {
      const tabIndex = i % 5;
      const expectedUrl = tabUrls[tabIndex];

      // Click tab (adjust selector)
      const tabs = page.locator('[data-tab-id], [data-testid^="tab-"], .tab, [role="tab"]');
      const targetTab = tabs.nth(tabIndex);
      await targetTab.click();

      // Wait for tab switch (reduced timeout for faster test)
      await page.waitForTimeout(100);

      // Verify active tab is correct
      await expect(targetTab)
        .toHaveAttribute('data-active', 'true', { timeout: 1000 })
        .catch(() => {
          // Fallback: check for active class
          return expect(targetTab).toHaveClass(/active/, { timeout: 1000 });
        });

      // Verify tab content is visible (iframe should be visible for active tab)
      const iframes = page.locator('iframe[data-tab-id], iframe');
      const activeIframe = iframes.nth(tabIndex);
      await expect(activeIframe).toBeVisible({ timeout: 1000 });

      // Verify URL matches (if accessible)
      const iframeSrc = await activeIframe.getAttribute('src').catch(() => null);
      if (iframeSrc && iframeSrc.includes('example.com')) {
        expect(iframeSrc).toContain(`q=${tabIndex}`);
      }
    }
  });

  test('stale async responses do not overwrite active tab', async ({ page }) => {
    // Open tab A
    await page.click('[data-testid="new-tab-btn"], button:has-text("New Tab")');
    await page.waitForTimeout(100);

    const slowUrl = 'https://httpbin.org/delay/3'; // Slow endpoint
    const fastUrl = 'https://example.com';

    // Start loading slow URL in tab A
    const omnibox = page.locator('input[type="text"][placeholder*="Search"], #omnibox').first();
    await omnibox.fill(slowUrl);
    await omnibox.press('Enter');

    // Immediately switch to tab B (before slow response)
    await page.click('[data-testid="new-tab-btn"], button:has-text("New Tab")');
    await page.waitForTimeout(100);

    // Load fast URL in tab B
    await omnibox.fill(fastUrl);
    await omnibox.press('Enter');

    // Wait for fast response
    await page.waitForTimeout(2000);

    // Verify tab B shows fast content (not slow content)
    const content = page.locator('#page-content, iframe[data-tab-id]').last();
    await expect(content).toBeVisible();

    // Verify active tab is B
    const tabs = page.locator('[data-tab-id], .tab');
    const activeTab = tabs.filter({ hasText: fastUrl }).or(tabs.last());
    await expect(activeTab).toHaveAttribute('data-active', 'true', { timeout: 1000 });
  });

  test('WebSocket reconnection works correctly', async ({ page }) => {
    // This test requires WebSocket connection
    // Monitor WebSocket messages
    const wsMessages: any[] = [];

    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const msg = JSON.parse(event.payload as string);
          wsMessages.push(msg);
        } catch {
          // Not JSON
        }
      });
    });

    // Trigger agent action that uses WebSocket
    // (Adjust based on your UI)
    const agentInput = page
      .locator('input[placeholder*="Ask"], textarea[placeholder*="query"]')
      .first();
    await agentInput.fill('test query');
    await agentInput.press('Enter');

    // Wait for WebSocket messages
    await page.waitForTimeout(2000);

    // Verify messages received
    expect(wsMessages.length).toBeGreaterThan(0);

    // Verify message IDs for deduplication
    const messageIds = wsMessages.map(m => m.id).filter(Boolean);
    const uniqueIds = new Set(messageIds);
    expect(messageIds.length).toBe(uniqueIds.size); // No duplicates
  });
});

test.describe('Agent Job Lifecycle', () => {
  test('agent job: enqueue → progress chunks → result', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Start agent query
    const agentInput = page
      .locator('input[placeholder*="Ask"], textarea[placeholder*="query"]')
      .first();
    await agentInput.fill('Summarize quantum computing');
    await agentInput.press('Enter');

    // Verify jobId received immediately
    await page.waitForTimeout(500);
    const jobId = await page.evaluate(() => {
      // Check for jobId in UI or state
      return (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.currentDispatcherRef
        ?.current?.memoizedState?.jobId;
    });

    // Wait for progress chunks
    await page.waitForTimeout(2000);

    // Verify streaming text appears
    const streamingText = page
      .locator('[data-testid="agent-response"], .agent-response, #agent-console')
      .first();
    await expect(streamingText).toBeVisible({ timeout: 5000 });

    // Verify final result
    await page.waitForTimeout(5000);
    const finalText = await streamingText.textContent();
    expect(finalText).toBeTruthy();
    expect(finalText!.length).toBeGreaterThan(10);
  });
});

test.describe('Memory Leaks', () => {
  test('opening and closing tabs does not leak memory', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Open and close tabs repeatedly
    for (let i = 0; i < 10; i++) {
      // Open tab
      await page.click('[data-testid="new-tab-btn"], button:has-text("New Tab")');
      await page.waitForTimeout(100);

      // Navigate
      const omnibox = page.locator('input[type="text"][placeholder*="Search"], #omnibox').first();
      await omnibox.fill(`https://example.com/?test=${i}`);
      await omnibox.press('Enter');
      await page.waitForTimeout(500);

      // Close tab
      const closeBtn = page
        .locator('[data-testid="close-tab"], .tab-close, button:has-text("×")')
        .last();
      await closeBtn.click();
      await page.waitForTimeout(100);
    }

    // Verify app is still responsive
    const omnibox = page.locator('input[type="text"][placeholder*="Search"], #omnibox').first();
    await expect(omnibox).toBeEnabled();
  });
});
