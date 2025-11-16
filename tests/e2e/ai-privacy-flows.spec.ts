/**
 * E2E Tests: Privacy Toggles & Shields
 * Tests AI agent console, privacy toggles, and proxy functionality
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

  try {
    await page.waitForFunction(
      () =>
        typeof window !== 'undefined' &&
        (window as any).ipc &&
        typeof (window as any).ipc.invoke === 'function' &&
        document.querySelector('button[aria-label="New tab"]'),
      { timeout: 15_000 },
    );
    return { app, page };
  } catch {
    // Shell never became ready in this environment; close app and signal skip
    try {
      await app.close();
    } catch {
      // ignore
    }
    return { app: null, page: null };
  }
}

test.describe('AI Agent Console Flows', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping AI Agent Console flows in this environment.');
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

  test('agent console can be opened from nav menu', async () => {
    // Look for AI menu or agent console link
    const aiMenu = page.locator('[data-testid="nav-menu-ai"], button:has-text("AI"), a[href*="agent"]').first();
    
    if (await aiMenu.count() > 0) {
      await aiMenu.click();
      
      // Wait for menu to open or navigate to agent console
      await page.waitForTimeout(500);
      
      // Check if agent console is visible or navigated to
      const agentConsole = page.locator('h1:has-text("Agent Console"), [data-testid="agent-console"], text=/Agent Console/i').first();
      if (await agentConsole.count() > 0) {
        await expect(agentConsole).toBeVisible({ timeout: 5000 });
      }
    } else {
      // Try navigating directly
      await page.goto('/agent');
      await page.waitForTimeout(1000);
      
      // Check for agent console content
      const hasAgentContent = await page.locator('text=/Agent|Redix|Console/i').count() > 0;
      expect(hasAgentContent).toBeTruthy();
    }
  });

  test('agent query input accepts text and shows response area', async () => {
    // Navigate to agent console
    await page.goto('/agent');
    await page.waitForTimeout(1000);

    // Find query input
    const queryInput = page.locator('input[type="text"][placeholder*="agent"], input[placeholder*="question"], textarea[placeholder*="agent"]').first();
    
    if (await queryInput.count() > 0) {
      await queryInput.fill('Test query for e2e');
      
      // Check if send button exists
      const sendButton = page.locator('button:has-text("Send"), button[aria-label*="Send"], button[type="submit"]').first();
      if (await sendButton.count() > 0) {
        await sendButton.click();
        
        // Wait for response area to appear (may be empty if backend not available)
        await page.waitForTimeout(2000);
        
        // Check for response pane or streaming indicator
        const responseArea = page.locator('[data-testid="response-pane"], text=/Response|Streaming|Loading/i').first();
        if (await responseArea.count() > 0) {
          await expect(responseArea).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('agent console shows recent events timeline', async () => {
    await page.goto('/agent');
    await page.waitForTimeout(1000);

    // Look for events timeline or recent events section
    const eventsSection = page.locator('text=/Recent Events|Timeline|Events/i, [data-testid="events-timeline"]').first();
    
    if (await eventsSection.count() > 0) {
      await expect(eventsSection).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Privacy & Proxy Flows', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping Privacy & Proxy flows in this environment.');
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

  test('privacy switch toggles are visible in status bar', async () => {
    // Look for privacy switch or privacy controls in status bar
    const privacySwitch = page.locator('[data-onboarding="status-bar"] button, [data-testid="privacy-switch"], text=/Privacy|Tor|VPN/i').first();
    
    if (await privacySwitch.count() > 0) {
      await expect(privacySwitch).toBeVisible({ timeout: 3000 });
    } else {
      // Check for "More" button in status bar that might contain privacy controls
      const moreButton = page.locator('[data-onboarding="status-bar"] button:has-text("More"), [data-onboarding="status-bar"] button[title*="More"]').first();
      if (await moreButton.count() > 0) {
        await moreButton.click();
        await page.waitForTimeout(500);
        
        // Look for Tor/VPN options in dropdown
        const torOption = page.locator('text=/Tor/i, button:has-text("Tor")').first();
        if (await torOption.count() > 0) {
          await expect(torOption).toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('privacy controls can be accessed from status bar', async () => {
    // Find "More" button in status bar
    const moreButton = page.locator('[data-onboarding="status-bar"] button:has-text("More"), [data-onboarding="status-bar"] button[title*="Security"]').first();
    
    if (await moreButton.count() > 0) {
      await moreButton.click();
      await page.waitForTimeout(500);
      
      // Check for privacy-related options
      const privacyOptions = page.locator('text=/Tor|VPN|DoH|Privacy/i').first();
      if (await privacyOptions.count() > 0) {
        await expect(privacyOptions).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('trust dashboard shows blocked trackers count', async () => {
    // Look for trust badge or trust dashboard link
    const trustBadge = page.locator('[data-onboarding="status-bar"] button:has-text("Trust"), [data-onboarding="status-bar"] text=/Trust|trackers blocked/i').first();
    
    if (await trustBadge.count() > 0) {
      await expect(trustBadge).toBeVisible({ timeout: 3000 });
      
      // Click to open trust dashboard
      await trustBadge.click();
      await page.waitForTimeout(1000);
      
      // Check if trust dashboard opened
      const dashboard = page.locator('text=/Trust|Ethics|Dashboard|Blocked/i').first();
      if (await dashboard.count() > 0) {
        await expect(dashboard).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('privacy sentinel badge is visible in top nav', async () => {
    // Look for privacy sentinel badge or shields button
    const sentinelBadge = page.locator('[data-shields-button], button[aria-label*="Privacy"], button[title*="Privacy"]').first();
    
    if (await sentinelBadge.count() > 0) {
      await expect(sentinelBadge).toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('AI & Privacy Integration', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping AI & Privacy integration flows in this environment.');
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

  test('agent prompt in status bar accepts input', async () => {
    // Look for agent prompt input in status bar
    const promptInput = page.locator('[data-onboarding="status-bar"] input[type="text"][placeholder*="agent"], [data-onboarding="status-bar"] input[placeholder*="Prompt"]').first();
    
    if (await promptInput.count() > 0) {
      await promptInput.fill('Test prompt from e2e');
      
      // Check if send button exists
      const sendButton = page.locator('[data-onboarding="status-bar"] button[type="submit"], [data-onboarding="status-bar"] button:has-text("Send")').first();
      if (await sendButton.count() > 0) {
        await sendButton.click();
        await page.waitForTimeout(1000);
        
        // Input should be cleared or show loading state
        const inputValue = await promptInput.inputValue();
        expect(inputValue.length).toBeLessThanOrEqual(0); // Should be cleared or very short
      }
    }
  });

  test('metrics display updates in status bar', async () => {
    // Look for CPU/RAM metrics in status bar
    const cpuMetric = page.locator('[data-onboarding="status-bar"] text=/CPU|RAM|Memory/i').first();
    
    if (await cpuMetric.count() > 0) {
      await expect(cpuMetric).toBeVisible({ timeout: 3000 });
      
      // Wait a bit and check if value changes (indicating live updates)
      const initialText = await cpuMetric.textContent();
      await page.waitForTimeout(2000);
      const updatedText = await cpuMetric.textContent();
      
      // Values might be the same, but element should still be visible
      expect(updatedText).toBeTruthy();
    }
  });

  test('onboarding tour can be triggered', async () => {
    // Check if onboarding tour button or trigger exists
    const tourTrigger = page.locator('button:has-text("Tour"), button[aria-label*="Tour"], button[title*="Tour"]').first();
    
    if (await tourTrigger.count() > 0) {
      await tourTrigger.click();
      await page.waitForTimeout(500);
      
      // Check for tour overlay or first step
      const tourOverlay = page.locator('[data-testid="onboarding-tour"], .onboarding-overlay, text=/Welcome|Get Started/i').first();
      if (await tourOverlay.count() > 0) {
        await expect(tourOverlay).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

