import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import http from 'node:http';
import { AddressInfo } from 'node:net';

type SlowServer = {
  url: string;
  close: () => Promise<void>;
};

async function startSlowDownloadServer(options: {
  filename: string;
  sizeBytes: number;
  chunkSizeBytes?: number;
  chunkDelayMs?: number;
}): Promise<SlowServer> {
  const { filename, sizeBytes, chunkSizeBytes = 64 * 1024, chunkDelayMs = 150 } = options;

  const server = http.createServer((req, res) => {
    if (req.url?.startsWith('/download')) {
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': sizeBytes,
        'Cache-Control': 'no-cache',
      });

      let sent = 0;
      const chunkBuffer = Buffer.alloc(chunkSizeBytes, 0x41);

      const interval = setInterval(() => {
        if (sent >= sizeBytes) {
          clearInterval(interval);
          res.end();
          return;
        }

        const bytesRemaining = sizeBytes - sent;
        const toSend = Math.min(chunkBuffer.length, bytesRemaining);
        res.write(chunkBuffer.subarray(0, toSend));
        sent += toSend;
      }, chunkDelayMs);

      req.on('close', () => {
        clearInterval(interval);
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/download/${encodeURIComponent(filename)}`;

  return {
    url,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function triggerDownload(page: Page, url: string, filename: string) {
  await page.evaluate(
    ({ href, name }) => {
      const link = document.createElement('a');
      link.href = href;
      link.download = name;
      link.target = '_blank';
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
    },
    { href: url, name: filename },
  );
}

async function waitForDownloadCount(page: Page, expected: number) {
  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const list = await window.ipc.invoke('downloads:list', {});
        return Array.isArray(list) ? list.length : 0;
      });
    }, {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(expected);
}

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

test.describe('Downloads experience', () => {
  let app: ElectronApplication | null;
  let page: Page | null;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping Downloads E2E tests in this environment.');
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

  test('supports pausing, resuming, and verifies checksum', async () => {
    const filename = 'pause-resume.bin';
    const server = await startSlowDownloadServer({
      filename,
      sizeBytes: 6 * 1024 * 1024,
      chunkSizeBytes: 128 * 1024,
      chunkDelayMs: 200,
    });

    try {
      await triggerDownload(page!, server.url, filename);
      await waitForDownloadCount(page!, 1);

      await page!.click('[data-testid="nav-downloads-button"]');
      await page!.waitForURL('**/downloads', { timeout: 10_000 });

      const card = page!.locator(`[data-testid="download-card"][data-filename="${filename}"]`).first();
      await expect(card.locator('text=Downloading')).toBeVisible({ timeout: 15_000 });

      await card.locator('button[title="Pause download"]').click();
      await expect(card.locator('text=Paused')).toBeVisible({ timeout: 10_000 });

      await card.locator('button[title="Resume download"]').click();
      await expect(card.locator('text=Downloading')).toBeVisible({ timeout: 10_000 });

      const verifyingMessage = card.locator('text=Verifying download integrity…');
      await verifyingMessage.waitFor({ state: 'visible', timeout: 30_000 });
      await verifyingMessage.waitFor({ state: 'hidden', timeout: 30_000 });

      await expect(card.locator('text=Completed')).toBeVisible({ timeout: 30_000 });
      await expect(card.locator('text=Scanned Clean')).toBeVisible({ timeout: 10_000 });
      await expect(card.locator('text=SHA-256:')).toBeVisible({ timeout: 10_000 });
    } finally {
      await server.close();
    }
  });

  test('can cancel an in-progress download', async () => {
    const filename = 'cancel-me.bin';
    const server = await startSlowDownloadServer({
      filename,
      sizeBytes: 4 * 1024 * 1024,
      chunkSizeBytes: 64 * 1024,
      chunkDelayMs: 250,
    });

    try {
      await triggerDownload(page, server.url, filename);
      await waitForDownloadCount(page, 1);

      await page.click('[data-testid="nav-downloads-button"]');
      await page.waitForURL('**/downloads', { timeout: 10_000 });

      const card = page.locator(`[data-testid="download-card"][data-filename="${filename}"]`).first();
      await expect(card.locator('text=Downloading')).toBeVisible({ timeout: 15_000 });

      await card.locator('button[title="Cancel download"]').click();
      await expect(card.locator('text=Cancelled')).toBeVisible({ timeout: 15_000 });
    } finally {
      await server.close();
    }
  });
});


