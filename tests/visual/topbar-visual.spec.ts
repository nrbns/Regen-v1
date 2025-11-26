/**
 * Visual Regression Tests for TopBar Component
 * Tests TopBar component in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';

test.describe('TopBar Component Visual Tests', () => {
  test('TopBar default should match snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=ui-components-topbar--default');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const iframe = page.frameLocator('iframe').first();
    await expect(iframe.locator('body')).toHaveScreenshot('topbar-default.png', {
      animations: 'disabled',
    });
  });
});
