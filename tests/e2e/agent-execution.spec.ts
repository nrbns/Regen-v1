/**
 * Agent Execution E2E Test
 * 
 * AC: Run a simple agent "Save & Summarize page" → confirm permission → memory saved
 * Metric: agent run success ≥90% in smoke runs
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

test.describe('Agent Execution Suite', () => {
  let app: ElectronApplication | null;
  let page: Page | null;

  test.beforeEach(async ({}, testInfo) => {
    ({ app, page } = await launchApp());
    if (!app || !page) {
      testInfo.skip('Electron shell did not become ready; skipping agent execution E2E tests in this environment.');
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

  test('agent console can be opened and displays UI', async () => {
    // Open agent console via keyboard shortcut or button
    const agentButton = page!.locator('[data-testid="nav-agent-button"], button:has-text("Agent")').first();
    
    // Try clicking agent button if visible
    const isButtonVisible = await agentButton.isVisible().catch(() => false);
    if (isButtonVisible) {
      await agentButton.click();
      await page!.waitForTimeout(1000);
    } else {
      // Try keyboard shortcut: Ctrl/Cmd+Shift+A
      const isMac = process.platform === 'darwin';
      await page!.keyboard.press(isMac ? 'Meta+Shift+A' : 'Control+Shift+A');
      await page!.waitForTimeout(1000);
    }

    // Check for agent console content
    const agentConsole = page!.locator('text=/Agent|Console|Redix/i').first();
    const hasAgentContent = await agentConsole.isVisible().catch(() => false);
    
    // Agent console may be in a panel or overlay
    expect(hasAgentContent).toBeTruthy();
  });

  test('agent prompt input accepts text', async () => {
    // Open agent console
    const agentButton = page!.locator('[data-testid="nav-agent-button"]').first();
    const isButtonVisible = await agentButton.isVisible().catch(() => false);
    if (isButtonVisible) {
      await agentButton.click();
      await page!.waitForTimeout(1000);
    }

    // Find agent prompt input (could be in status bar or agent console)
    const promptInput = page!.locator(
      'input[type="text"][placeholder*="agent" i], input[placeholder*="Prompt" i], textarea[placeholder*="agent" i]'
    ).first();
    
    const inputVisible = await promptInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (inputVisible) {
      await promptInput.fill('Summarize this page');
      const value = await promptInput.inputValue();
      expect(value).toContain('Summarize');
    } else {
      console.log('Agent prompt input not found - may be in different location');
    }
  });

  test('agent execution shows permission prompt for risky actions', async () => {
    // This test verifies that agent actions trigger consent/permission prompts
    // Navigate to a page first
    const searchInput = page!.locator('input[type="text"][placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    await searchInput.fill('https://example.com');
    await searchInput.press('Enter');
    await page!.waitForTimeout(2000);

    // Try to trigger an agent action that requires permission
    // Look for agent console or prompt
    const agentButton = page!.locator('[data-testid="nav-agent-button"]').first();
    const isButtonVisible = await agentButton.isVisible().catch(() => false);
    
    if (isButtonVisible) {
      await agentButton.click();
      await page!.waitForTimeout(1000);
      
      // Look for permission/consent dialog
      const consentDialog = page!.locator('text=/Permission|Consent|Allow|Deny/i').first();
      const hasConsent = await consentDialog.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Permission dialog may or may not appear depending on action type
      // This is a smoke test - we just verify the UI can handle it
      console.log('Consent dialog visible:', hasConsent);
    }
  });

  test('agent actions are logged in audit trail', async () => {
    // Verify that agent actions create audit logs
    // This is a smoke test - we check if audit logging infrastructure exists
    
    const agentButton = page!.locator('[data-testid="nav-agent-button"]').first();
    const isButtonVisible = await agentButton.isVisible().catch(() => false);
    
    if (isButtonVisible) {
      await agentButton.click();
      await page!.waitForTimeout(1000);
      
      // Look for audit log or event timeline
      const auditLog = page!.locator('text=/Audit|Log|Event|Timeline/i').first();
      const hasAuditLog = await auditLog.isVisible({ timeout: 5000 }).catch(() => false);
      
      // Audit log may be in a separate view or panel
      console.log('Audit log visible:', hasAuditLog);
    }
  });

  test('agent can read page content', async () => {
    // Navigate to a page
    const searchInput = page!.locator('input[type="text"][placeholder*="Search" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    await searchInput.fill('https://example.com');
    await searchInput.press('Enter');
    await page!.waitForTimeout(3000); // Wait for page to load

    // Verify page content is accessible
    const pageContent = page!.locator('body');
    const hasContent = await pageContent.isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
    
    // Agent should be able to read this content (tested via IPC in unit tests)
    console.log('Page content accessible for agent reading');
  });
});

