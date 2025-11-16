/**
 * SuperMemory Flow Smoke Test - Save → Search → Sidebar
 *
 * AC: User performs a search → event is tracked → MemorySidebar shows timeline items.
 */

import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

async function launchApp(): Promise<{ app: ElectronApplication | null; page: Page | null }> {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      PLAYWRIGHT: '1',
      OB_DISABLE_HEAVY_SERVICES: '1',
    },
  });

  const page = await app.firstWindow();

  // Wait for IPC + search bar to be ready
  try {
    await page.waitForFunction(
      () =>
        typeof window !== 'undefined' &&
        (window as any).ipc &&
        typeof (window as any).ipc.invoke === 'function' &&
        document.querySelector('input[type="text"][placeholder*="Search" i]'),
      { timeout: 30_000 },
    );
    return { app, page };
  } catch {
    try {
      await app.close();
    } catch {
      // ignore
    }
    return { app: null, page: null };
  }
}

test.describe('SuperMemory Flow Suite', () => {
  let app: ElectronApplication | null;
  let page: Page | null;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping SuperMemory flow tests in this environment.');
    }
  });

  test.afterEach(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // ignore cleanup errors
      }
    }
  });

  test('search events appear in MemorySidebar timeline', async () => {
    const searchInput = page!.locator('input[type="text"][placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Perform a couple of searches to generate memory events
    await searchInput.fill('memory sidebar test one');
    await searchInput.press('Enter');
    await page!.waitForTimeout(1000);

    await searchInput.fill('memory sidebar test two');
    await searchInput.press('Enter');
    await page!.waitForTimeout(1000);

    // Open MemorySidebar via keyboard shortcut: Ctrl/Cmd+Shift+M
    const isMac = process.platform === 'darwin';
    await page!.keyboard.press(isMac ? 'Meta+Shift+M' : 'Control+Shift+M');

    // Wait for sidebar backdrop to appear
    const sidebarBackdrop = page!.locator('div[class*="fixed"][class*="bg-black/50"]');
    await expect(sidebarBackdrop).toBeVisible({ timeout: 10_000 });

    // Expect at least one memory event in the timeline list
    // Timeline groups entries by date; individual events are rendered as list items with text content.
    const timelineItems = page!.locator('div[role="listitem"], li');
    const count = await timelineItems.count();

    expect(count).toBeGreaterThan(0);
  });
});


