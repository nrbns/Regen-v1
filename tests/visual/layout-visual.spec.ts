/**
 * Visual Regression Tests for Layout Components
 * Tests layout components in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Layout Engine Visual Tests', () => {
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

  test('LayoutEngine default should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--default');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const preview = await getPreviewLocator(page);
    await expect(preview).toHaveScreenshot('layout-engine-default.png', {
      animations: 'disabled',
    });
  });

  test('LayoutEngine with sidebar should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--with-sidebar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const preview = await getPreviewLocator(page);
    await expect(preview).toHaveScreenshot('layout-engine-sidebar.png', {
      animations: 'disabled',
    });
  });
});
