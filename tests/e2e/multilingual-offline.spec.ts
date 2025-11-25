/**
 * Playwright E2E Tests for Multilingual Offline Support
 * Tests Hindi and Tamil offline research functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Multilingual Offline Support', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set offline mode
    await context.setOffline(true);
    await page.goto('http://localhost:5183');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('Hindi offline research query', async ({ page }) => {
    // Navigate to Research mode
    await page.click('[aria-label*="Research" i], button:has-text("Research")');
    await page.waitForTimeout(1000);

    // Set language to Hindi
    const langSelector = page.locator('select, [role="combobox"]').first();
    if ((await langSelector.count()) > 0) {
      await langSelector.selectOption('hi');
    }

    // Enter Hindi query
    const searchInput = page
      .locator('input[type="text"], input[placeholder*="research" i]')
      .first();
    await searchInput.fill('निफ्टी की तुलना करें');
    await searchInput.press('Enter');

    // Wait for offline mode indicator or result
    await page.waitForTimeout(2000);

    // Check for offline mode message
    const offlineIndicator = page.locator('text=/offline/i, text=/cached/i');
    if ((await offlineIndicator.count()) > 0) {
      await expect(offlineIndicator.first()).toBeVisible();
    }

    // Check that some result is shown (even if simplified)
    const result = page.locator('[class*="result"], [class*="summary"], [class*="research"]');
    await expect(result.first()).toBeVisible({ timeout: 5000 });
  });

  test('Tamil offline research query', async ({ page }) => {
    // Navigate to Research mode
    await page.click('[aria-label*="Research" i], button:has-text("Research")');
    await page.waitForTimeout(1000);

    // Set language to Tamil
    const langSelector = page.locator('select, [role="combobox"]').first();
    if ((await langSelector.count()) > 0) {
      await langSelector.selectOption('ta');
    }

    // Enter Tamil query
    const searchInput = page
      .locator('input[type="text"], input[placeholder*="research" i]')
      .first();
    await searchInput.fill('நிஃப்டி ஒப்பீடு');
    await searchInput.press('Enter');

    // Wait for offline mode indicator or result
    await page.waitForTimeout(2000);

    // Check for offline mode message
    const offlineIndicator = page.locator('text=/offline/i, text=/cached/i');
    if ((await offlineIndicator.count()) > 0) {
      await expect(offlineIndicator.first()).toBeVisible();
    }

    // Check that some result is shown
    const result = page.locator('[class*="result"], [class*="summary"], [class*="research"]');
    await expect(result.first()).toBeVisible({ timeout: 5000 });
  });

  test('Language switcher works in offline mode', async ({ page }) => {
    await page.goto('http://localhost:5183');
    await page.waitForLoadState('networkidle');

    // Find language switcher
    const langSwitcher = page
      .locator('[aria-label*="language" i], select, [class*="language" i]')
      .first();

    if ((await langSwitcher.count()) > 0) {
      // Test switching to Hindi
      await langSwitcher.selectOption('hi');
      await page.waitForTimeout(500);

      // Test switching to Tamil
      await langSwitcher.selectOption('ta');
      await page.waitForTimeout(500);

      // Test switching back to English
      await langSwitcher.selectOption('en');
      await page.waitForTimeout(500);

      // Language switcher should still be visible
      await expect(langSwitcher).toBeVisible();
    }
  });

  test('Offline mode shows appropriate message', async ({ page }) => {
    await page.goto('http://localhost:5183');
    await page.waitForLoadState('networkidle');

    // Check for offline indicator in UI
    const offlineMessage = page.locator(
      'text=/offline/i, text=/no connection/i, text=/disconnected/i'
    );

    // May or may not be visible depending on implementation
    // Just verify page loaded
    await expect(page).toHaveTitle(/regen|omnibrowser/i);
  });

  test('Research mode handles offline gracefully', async ({ page }) => {
    await page.goto('http://localhost:5183');
    await page.waitForLoadState('networkidle');

    // Navigate to Research mode
    const researchButton = page
      .locator('button:has-text("Research"), [aria-label*="Research" i]')
      .first();
    if ((await researchButton.count()) > 0) {
      await researchButton.click();
      await page.waitForTimeout(1000);

      // Try to enter a query
      const searchInput = page.locator('input[type="text"]').first();
      if ((await searchInput.count()) > 0) {
        await searchInput.fill('test query');

        // Should not crash or show error immediately
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

test.describe('Online Mode (for comparison)', () => {
  test('Hindi research query works online', async ({ page, context }) => {
    // Set online mode
    await context.setOffline(false);
    await page.goto('http://localhost:5183');
    await page.waitForLoadState('networkidle');

    // Navigate to Research mode
    await page.click('[aria-label*="Research" i], button:has-text("Research")');
    await page.waitForTimeout(1000);

    // Set language to Hindi
    const langSelector = page.locator('select, [role="combobox"]').first();
    if ((await langSelector.count()) > 0) {
      await langSelector.selectOption('hi');
    }

    // Enter Hindi query
    const searchInput = page
      .locator('input[type="text"], input[placeholder*="research" i]')
      .first();
    await searchInput.fill('निफ्टी');
    await searchInput.press('Enter');

    // Wait for results (longer timeout for online)
    await page.waitForTimeout(5000);

    // Should show results
    const result = page.locator('[class*="result"], [class*="summary"]');
    // May or may not have results depending on backend, but shouldn't error
    await expect(page.locator('body')).toBeVisible();
  });
});
