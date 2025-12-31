import { test, expect } from '@playwright/test';

// E2E: Address bar navigation should result in a ContextEngine entry in IndexedDB
test('address navigation persists to ContextEngine IndexedDB', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Find address input by placeholder text (more robust selector)
  const input = page.locator('input[placeholder^="Search or enter URL"]');
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.click();
  await input.fill('example.org');
  await input.press('Enter');

  // Wait briefly for navigation + persistence
  await page.waitForTimeout(400);

  // Try to read our storage key from the DB
  const contexts = await page.evaluate(async () => {
    return new Promise<any[]>((resolve, reject) => {
      const req = indexedDB.open('regen-contexts');
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction('contexts', 'readonly');
          const store = tx.objectStore('contexts');
          const getReq = store.get('regen:contexts');
          getReq.onsuccess = () => {
            try {
              const raw = getReq.result;
              if (!raw) return resolve([]);
              // raw is stringified array
              const parsed = JSON.parse(raw as string) as any[];
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
          };
          getReq.onerror = () => reject(getReq.error);
        } catch (err) {
          reject(err);
        }
      };
      req.onupgradeneeded = () => {
        // No DB yet
        resolve([]);
      };
    });
  });

  expect(Array.isArray(contexts)).toBe(true);
  expect(contexts.length).toBeGreaterThan(0);

  // Ensure at least one context entry has the navigated URL
  const has = contexts.some(c => c.url && c.url.includes('example.org'));
  expect(has).toBe(true);
});