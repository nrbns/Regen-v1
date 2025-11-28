/**
 * Visual Regression Tests for TopBar Component
 * Tests TopBar component in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('TopBar Component Visual Tests', () => {
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

  test('TopBar default should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-components-topbar--default');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const preview = await getPreviewLocator(page);
    await expect(preview).toHaveScreenshot('topbar-default.png', {
      animations: 'disabled',
    });
  });
});
