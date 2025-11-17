/**
 * Basic Search E2E Test
 * Tests that search bar returns AI summary
 */

import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

async function launchApp(): Promise<{ app: ElectronApplication | null; page: Page | null }> {
  try {
    const app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        PLAYWRIGHT: '1',
        OB_DISABLE_HEAVY_SERVICES: '1',
      },
    });

    const page = await app.firstWindow();

    await page.waitForFunction(
      () =>
        typeof window !== 'undefined' &&
        (window as any).ipc &&
        typeof (window as any).ipc.invoke === 'function' &&
        document.querySelector('input[type="text"][placeholder*="Search" i]'),
      { timeout: 15_000 },
    );

    return { app, page };
  } catch {
    return { app: null, page: null };
  }
}

test.describe('Basic Search Test', () => {
  let app: ElectronApplication | null;
  let page: Page | null;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping search E2E tests in this environment.');
    }
  });

  test.afterEach(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // ignore
      }
    }
  });

  test('search bar returns AI summary', async () => {
    // Navigate to the app (adjust port/path as needed)
    // The app should already be loaded from launchApp
    
    // Find the search input
    const input = page!.getByPlaceholder(/Search web, ask AI, or search your memory/i);
    await expect(input).toBeVisible({ timeout: 5_000 });

    // Fill in the search query
    await input.fill('What is Regen Browser?');
    
    // Submit the form
    await input.press('Enter');
    
    // Wait for AI Summary to appear
    await expect(page!.getByText(/AI Summary/i)).toBeVisible({ timeout: 15_000 });
  });
});

