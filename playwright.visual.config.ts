import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual regression tests
 * Run with: npx playwright test --config=playwright.visual.config.ts
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.STORYBOOK_URL || 'http://localhost:6006',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'npx storybook dev',
        url: 'http://localhost:6006',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
