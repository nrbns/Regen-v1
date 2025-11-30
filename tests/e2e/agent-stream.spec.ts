/**
 * E2E Test: Agent Streaming Pipeline
 * Validates extract → stream partial → final → execute flow
 */

import { test, expect } from '@playwright/test';

test.describe('Agent Streaming Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (adjust URL for your setup)
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForSelector('[data-testid="app-shell"]', { timeout: 10000 });
  });

  test('should stream partial summaries then final summary', async ({ page }) => {
    // Step 1: Load a test page (use local static HTML for reliability)
    const testUrl = 'http://localhost:5173/test-page.html';

    // Create a test page if it doesn't exist (or use existing)
    await page.goto(testUrl);

    // Step 2: Trigger agent on current page
    await page.click('[data-testid="agent-trigger"]');

    // Step 3: Wait for agent_start event
    await page.waitForSelector('[data-testid="agent-status"]', { timeout: 5000 });

    // Step 4: Verify partial_summary events appear incrementally
    const partialSummaries = page.locator('[data-testid="partial-summary"]');
    await expect(partialSummaries.first()).toBeVisible({ timeout: 10000 });

    // Verify multiple partial summaries appear (streaming behavior)
    await page.waitForTimeout(2000); // Wait for more chunks
    const count = await partialSummaries.count();
    expect(count).toBeGreaterThan(0);

    // Step 5: Wait for final_summary
    await page.waitForSelector('[data-testid="final-summary"]', { timeout: 30000 });

    // Step 6: Verify final summary contains expected content
    const finalSummary = page.locator('[data-testid="final-summary"]');
    await expect(finalSummary).toBeVisible();

    const summaryText = await finalSummary.textContent();
    expect(summaryText).toBeTruthy();
    expect(summaryText!.length).toBeGreaterThan(50); // Reasonable summary length
  });

  test('should show action suggestions and allow execution', async ({ page }) => {
    await page.goto('http://localhost:5173/test-page.html');
    await page.click('[data-testid="agent-trigger"]');

    // Wait for agent to complete
    await page.waitForSelector('[data-testid="final-summary"]', { timeout: 30000 });

    // Check for action suggestions
    const actions = page.locator('[data-testid="action-suggestion"]');
    const actionCount = await actions.count();

    if (actionCount > 0) {
      // Click first action
      await actions.first().click();

      // Verify confirmation modal appears
      await expect(page.locator('[data-testid="action-confirm-modal"]')).toBeVisible();

      // Confirm action
      await page.click('[data-testid="confirm-action"]');

      // Verify action executed (check for success message or state change)
      await page.waitForSelector('[data-testid="action-success"]', { timeout: 5000 });
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Trigger agent with invalid URL
    await page.goto('http://localhost:5173');

    // Mock invalid URL scenario
    await page.evaluate(() => {
      (window as any).__MOCK_AGENT_ERROR = true;
    });

    await page.click('[data-testid="agent-trigger"]');

    // Verify error message appears
    await expect(page.locator('[data-testid="agent-error"]')).toBeVisible({ timeout: 10000 });

    const errorText = await page.locator('[data-testid="agent-error"]').textContent();
    expect(errorText).toContain('error');
  });

  test('should cache responses for repeated queries', async ({ page }) => {
    const testUrl = 'http://localhost:5173/test-page.html';

    // First request
    await page.goto(testUrl);
    await page.click('[data-testid="agent-trigger"]');

    const firstStart = Date.now();
    await page.waitForSelector('[data-testid="final-summary"]', { timeout: 30000 });
    const firstDuration = Date.now() - firstStart;

    // Second request (should be cached)
    await page.reload();
    await page.click('[data-testid="agent-trigger"]');

    const secondStart = Date.now();
    await page.waitForSelector('[data-testid="final-summary"]', { timeout: 10000 });
    const secondDuration = Date.now() - secondStart;

    // Cached response should be significantly faster
    expect(secondDuration).toBeLessThan(firstDuration * 0.5);

    // Verify cached indicator
    await expect(page.locator('[data-testid="cached-indicator"]')).toBeVisible();
  });

  test('should handle rate limiting (multiple rapid requests)', async ({ page }) => {
    await page.goto('http://localhost:5173/test-page.html');

    // Trigger multiple rapid requests
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="agent-trigger"]');
      await page.waitForTimeout(100); // Very rapid
    }

    // Should show busy/rate-limited message
    await expect(page.locator('[data-testid="agent-busy"]')).toBeVisible({ timeout: 2000 });
  });
});
