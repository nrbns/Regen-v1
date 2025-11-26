/**
 * Visual Regression Tests for Skeleton Components
 * Tests UI components in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';

test.describe('Skeleton Components Visual Tests', () => {
  test('Skeleton default variant should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--default');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Wait for animations

    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toHaveScreenshot('skeleton-default.png', {
      animations: 'disabled',
    });
  });

  test('SkeletonCard should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--card');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toHaveScreenshot('skeleton-card.png', {
      animations: 'disabled',
    });
  });

  test('SkeletonText should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--text');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toHaveScreenshot('skeleton-text.png', {
      animations: 'disabled',
    });
  });
});
