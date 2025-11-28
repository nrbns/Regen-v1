import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    viewport: { width: 1440, height: 900 },
    video: 'retain-on-failure',
    trace: 'retry-with-trace',
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev:web',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
