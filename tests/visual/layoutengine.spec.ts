/**
 * Visual Regression Tests - LayoutEngine + Skeleton Components
 * Uses Playwright to capture and compare visual snapshots
 */

import { test, expect } from '@playwright/test';

test.use({
  // Use the Storybook dev server URL if running locally (or the static Storybook build URL in CI)
  baseURL: process.env.STORYBOOK_URL ?? 'http://localhost:6006',
});

test.describe('Visual regression - LayoutEngine + Skeleton', () => {
  test('LayoutEngine default renders correctly', async ({ page }) => {
    // Render the Storybook story: Layout/LayoutEngine--Default
    await page.goto('/iframe.html?id=layout-layoutengine--default');

    // Wait for the layout engine to be visible
    await page
      .waitForSelector('[data-testid="layout-engine-root"]', { state: 'visible', timeout: 5000 })
      .catch(() => {
        // Fallback: wait for any header element
        return page.waitForSelector('header', { state: 'visible', timeout: 5000 });
      });

    // Optional: wait for skeleton shimmer to complete animation settle
    await page
      .locator('[data-testid="skeleton-card"]')
      .first()
      .waitFor({ state: 'attached', timeout: 2000 })
      .catch(() => {
        // Ignore if no skeleton cards present
      });

    // Wait a bit for animations to settle
    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot).toMatchSnapshot('layoutengine-default.png', { maxDiffPixelRatio: 0.001 });
  });

  test('LayoutEngine with right panel renders correctly', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--with-right-panel');

    await page.waitForSelector('header', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot).toMatchSnapshot('layoutengine-with-right-panel.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('LayoutEngine with skeleton loading state', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--with-skeleton');

    await page
      .waitForSelector('[data-testid="skeleton-card"]', { state: 'visible', timeout: 5000 })
      .catch(() => {
        return page.waitForSelector('.bg-slate-800', { state: 'visible', timeout: 5000 });
      });

    // Set reduced motion to avoid animation flakiness
    await page.addStyleTag({
      content: `* { transition: none !important; animation: none !important; }`,
    });

    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot).toMatchSnapshot('layoutengine-with-skeleton.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('SkeletonCard variant snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--card');

    await page
      .waitForSelector('[data-testid="skeleton-card"]', { state: 'visible', timeout: 5000 })
      .catch(() => {
        return page.waitForSelector('.bg-slate-800', { state: 'visible', timeout: 5000 });
      });

    // Set reduced motion to avoid animation flakiness
    await page.addStyleTag({
      content: `* { transition: none !important; animation: none !important; }`,
    });

    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot).toMatchSnapshot('skeletoncard-default.png', { maxDiffPixelRatio: 0.001 });
  });

  test('SkeletonList variant snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=components-skeleton--list');

    await page.waitForSelector('.bg-slate-800', { state: 'visible', timeout: 5000 });

    // Set reduced motion
    await page.addStyleTag({
      content: `* { transition: none !important; animation: none !important; }`,
    });

    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot).toMatchSnapshot('skeletonlist-default.png', { maxDiffPixelRatio: 0.001 });
  });

  test('Responsive grid layout snapshot', async ({ page }) => {
    await page.goto('/iframe.html?id=layout-layoutengine--responsive-grid');

    await page.waitForSelector('header', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);

    const screenshot = await page.screenshot({ fullPage: false });
    expect(screenshot).toMatchSnapshot('layoutengine-responsive-grid.png', {
      maxDiffPixelRatio: 0.001,
    });
  });
});
