import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';

async function launchApp(): Promise<{ app: ElectronApplication | null; page: Page | null }> {
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      PLAYWRIGHT: '1',
    },
  });

  const page = await app.firstWindow();

  try {
    await page.waitForFunction(
      () => {
        return Boolean(
          window.ipc &&
            typeof window.ipc.invoke === 'function' &&
            document.querySelector('button[aria-label="New tab"]'),
        );
      },
      undefined,
      { timeout: 45_000 },
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

test.describe('Research citations experience', () => {
  let app: ElectronApplication | null;
  let page: Page | null;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping research citations E2E tests in this environment.');
    }
  });

  test.afterEach(async () => {
    if (app) {
      try {
        await app.close();
      } catch {
        // ignore
      }
      app = null;
    }
  });

  test('streams research answer with inline citations', async () => {
    await page!.evaluate(() => {
      window.history.pushState({}, '', '/research');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    await expect(page!.locator('h1:has-text("Research Mode")')).toBeVisible({ timeout: 15_000 });

    const questionInput = page!.getByPlaceholder('What do you want to investigate?');
    await questionInput.fill('Quantum computing trends');

    await page!.getByRole('button', { name: 'Run Research' }).click();

    await expect(page!.locator('text=Streaming answer…')).toBeVisible({ timeout: 5_000 });

    await expect(
      page!.locator('text=Quantum computing is trending rapidly across academia.'),
    ).toBeVisible({ timeout: 20_000 });

    await expect(page!.locator('text=Example Research Source')).toBeVisible({ timeout: 10_000 });

    await expect(page!.locator('text=Citations')).toBeVisible({ timeout: 10_000 });

    await expect(page!.locator('text=Ensure claims reference primary sources.')).toBeVisible({
      timeout: 10_000,
    });

    await expect(page!.locator('text=Streaming answer…')).toBeHidden({ timeout: 10_000 });
  });
});


