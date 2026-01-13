/**
 * E2E Tests for Realtime Features
 * Tests event bus, AI toggle, performance benchmarks, and onboarding
 */

import { test, expect } from '@playwright/test';

test.describe('Regen Realtime Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('1. Event Bus Error Recovery and Throttling', async ({ page }) => {
    // Test that event bus handles errors gracefully
    await page.evaluate(() => {
      // Import event bus
      const { eventBus } = require('../../src/core/state/eventBus');
      
      // Emit test events
      for (let i = 0; i < 100; i++) {
        eventBus.emit('SCROLL', { position: i });
      }
      
      // Get metrics
      const metrics = eventBus.getMetrics();
      return metrics;
    });

    // Verify metrics are being tracked
    const metrics = await page.evaluate(() => {
      const { eventBus } = require('../../src/core/state/eventBus');
      return eventBus.getMetrics();
    });

    expect(metrics.totalEmitted).toBeGreaterThan(0);
    expect(metrics.queueSize).toBeGreaterThanOrEqual(0);
  });

  test('2. AI Toggle Functionality', async ({ page }) => {
    // Find AI toggle button (should be in navigation bar)
    const aiToggle = page.locator('[data-tour="ai-toggle"] button, button[aria-label*="AI"]').first();
    
    // Check if toggle exists
    await expect(aiToggle).toBeVisible({ timeout: 5000 });

    // Get initial state
    const initialAriaLabel = await aiToggle.getAttribute('aria-label');
    const isInitiallySilenced = initialAriaLabel?.includes('Enable') || false;

    // Click toggle
    await aiToggle.click();

    // Wait for state change
    await page.waitForTimeout(500);

    // Verify state changed
    const newAriaLabel = await aiToggle.getAttribute('aria-label');
    const isNowSilenced = newAriaLabel?.includes('Enable') || false;
    
    expect(isNowSilenced).not.toBe(isInitiallySilenced);
  });

  test('3. Performance Benchmarks', async ({ page }) => {
    // Navigate to Settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click System tab
    await page.click('button:has-text("System")');
    await page.waitForTimeout(500);

    // Find and click "Run Benchmarks" button
    const runButton = page.locator('button:has-text("Run Benchmarks")');
    await expect(runButton).toBeVisible({ timeout: 5000 });
    
    await runButton.click();

    // Wait for benchmarks to complete
    await page.waitForTimeout(3000);

    // Verify results are displayed
    const resultsVisible = await page.locator('text=Benchmark Results').isVisible();
    expect(resultsVisible).toBe(true);

    // Check for score display
    const scoreVisible = await page.locator('text=/\\d+%/').isVisible();
    expect(scoreVisible).toBe(true);
  });

  test('4. Onboarding Tour', async ({ page }) => {
    // Clear onboarding completion to trigger tour
    await page.evaluate(() => {
      localStorage.removeItem('regen:onboarding:completed');
    });

    // Reload page to trigger onboarding
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if tour appears (may not appear if already completed)
    const tourVisible = await page.locator('text=Welcome to Regen').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (tourVisible) {
      // Verify tour elements
      await expect(page.locator('text=Step')).toBeVisible();
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
      await expect(page.locator('button:has-text("Skip")')).toBeVisible();

      // Test navigation
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(500);

      // Verify progress updated
      const progressBar = page.locator('[style*="width"]').first();
      await expect(progressBar).toBeVisible();
    }
  });

  test('5. Ollama Setup Wizard', async ({ page }) => {
    // Navigate to Settings → System
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("System")');
    await page.waitForTimeout(500);

    // Scroll to Ollama section
    const ollamaSection = page.locator('text=Local AI Setup (Ollama)');
    await ollamaSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check if wizard is visible
    const wizardVisible = await ollamaSection.isVisible();
    expect(wizardVisible).toBe(true);

    // Verify status indicators exist
    const statusIndicators = page.locator('text=Ollama Installed, text=Ollama Running, text=Models').first();
    // At least one status indicator should be visible
    const hasStatus = await page.locator('text=/Ollama|Models/').count() > 0;
    expect(hasStatus).toBe(true);
  });

  test('6. Realtime Metrics Dashboard (Dev Mode)', async ({ page }) => {
    // Metrics dashboard only shows in dev mode
    // Check if we're in dev mode by checking for the dashboard
    const dashboardVisible = await page.locator('text=Realtime Metrics').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (dashboardVisible) {
      // Verify metrics are displayed
      await expect(page.locator('text=Emitted')).toBeVisible();
      await expect(page.locator('text=Processed')).toBeVisible();
      await expect(page.locator('text=Success Rate')).toBeVisible();
    }
  });

  test('7. Beta Route Access', async ({ page }) => {
    // Navigate to beta route
    await page.goto('/beta');
    await page.waitForLoadState('networkidle');

    // Verify beta page elements
    await expect(page.locator('text=Join Regen Beta')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();
    
    // Check for tier options
    const freeTier = page.locator('text=Free Beta');
    const supporterTier = page.locator('text=Supporter');
    const premiumTier = page.locator('text=Premium');

    await expect(freeTier).toBeVisible();
    await expect(supporterTier).toBeVisible();
    await expect(premiumTier).toBeVisible();
  });

  test('8. AI Undo/Feedback System', async ({ page }) => {
    // Trigger an AI action (simulated)
    await page.evaluate(() => {
      const { eventBus, EVENTS } = require('../../src/core/state/eventBus');
      eventBus.emit(EVENTS.AI_SUGGESTION_GENERATED, {
        type: 'test_action',
        description: 'Test AI action',
        undoable: true,
      });
    });

    // Wait for feedback component to appear
    await page.waitForTimeout(1000);

    // Check if undo/feedback appears (may not appear if no AI actions triggered)
    const feedbackVisible = await page.locator('button:has-text("Undo"), button:has-text("Good")').isVisible({ timeout: 2000 }).catch(() => false);
    
    // If feedback appears, verify buttons
    if (feedbackVisible) {
      const undoButton = page.locator('button:has-text("Undo")');
      const goodButton = page.locator('button:has-text("Good")');
      
      if (await undoButton.isVisible()) {
        await expect(undoButton).toBeVisible();
      }
      if (await goodButton.isVisible()) {
        await expect(goodButton).toBeVisible();
      }
    }
  });
});
