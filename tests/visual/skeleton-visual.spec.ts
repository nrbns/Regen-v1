/**
 * Visual Regression Tests for Skeleton Components
 * Tests UI components in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Skeleton Components Visual Tests', () => {
  const getPreviewLocator = async (page: Page) => {
    const root = page.locator('#storybook-root');
    try {
      await page.waitForSelector('#storybook-root', { state: 'attached' });
      await page.waitForSelector('#storybook-root *', { state: 'attached', timeout: 5000 });
      return root;
    } catch {
      return page.locator('body');
    }
  };

  test('Skeleton default variant should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--default');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Wait for animations

    const preview = await getPreviewLocator(page);
    await expect(preview).toHaveScreenshot('skeleton-default.png', {
      animations: 'disabled',
    });
  });

  test('SkeletonCard should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--card');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const preview = await getPreviewLocator(page);
    await expect(preview).toHaveScreenshot('skeleton-card.png', {
      animations: 'disabled',
    });
  });

  test('SkeletonText should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--text');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const preview = await getPreviewLocator(page);
    await expect(preview).toHaveScreenshot('skeleton-text.png', {
      animations: 'disabled',
    });
  });
});
