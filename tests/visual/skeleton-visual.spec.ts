/**
 * Visual Regression Tests for Skeleton Components
 * Tests UI components in Storybook for visual regressions
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Skeleton Components Visual Tests', () => {
  const prepareStory = async (page: Page, storyPath: string) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(storyPath);
    await page.waitForSelector('#storybook-root', { state: 'attached' });
    await page.evaluate(() => {
      const root = document.querySelector('#storybook-root') as HTMLElement | null;
      if (root) {
        root.style.minHeight = '720px';
        root.style.width = '100%';
        root.style.padding = '32px';
        root.style.boxSizing = 'border-box';
        root.style.background = 'var(--surface-body, #0b1224)';
      }
      document.body.style.minHeight = '720px';
      document.body.style.background = 'var(--surface-body, #0b1224)';
    });
    await page.waitForTimeout(300);
    const root = page.locator('#storybook-root');
    return (await root.count()) > 0 ? root : page.locator('body');
  };

  test('Skeleton default variant should match snapshot', async ({ page }) => {
    const preview = await prepareStory(page, '/iframe.html?id=components-skeleton--default');
    await expect(preview).toHaveScreenshot('skeleton-default.png', {
      animations: 'disabled',
    });
  });

  test('SkeletonCard should match snapshot', async ({ page }) => {
    const preview = await prepareStory(page, '/iframe.html?id=components-skeleton--card');
    await expect(preview).toHaveScreenshot('skeleton-card.png', {
      animations: 'disabled',
    });
  });

  test('SkeletonText should match snapshot', async ({ page }) => {
    const preview = await prepareStory(page, '/iframe.html?id=components-skeleton--text');
    await expect(preview).toHaveScreenshot('skeleton-text.png', {
      animations: 'disabled',
    });
  });
});
