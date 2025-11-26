/**
 * Visual Regression Tests for Layout Components
 * Tests layout components in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';

test.describe('Layout Engine Visual Tests', () => {
  test('LayoutEngine default should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--default');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toHaveScreenshot('layout-engine-default.png', {
      animations: 'disabled',
    });
  });

  test('LayoutEngine with sidebar should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--with-sidebar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toHaveScreenshot('layout-engine-sidebar.png', {
      animations: 'disabled',
    });
  });
});
