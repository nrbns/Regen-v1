/**
 * E2E Tests for Performance Benchmarks
 * Tests benchmarking utilities and UI
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("System")');
    await page.waitForTimeout(500);
  });

  test('Benchmark Panel Renders', async ({ page }) => {
    // Scroll to benchmarks section
    const benchmarkSection = page.locator('text=Performance Benchmarks');
    await benchmarkSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Verify panel is visible
    await expect(benchmarkSection).toBeVisible();

    // Verify run button exists
    const runButton = page.locator('button:has-text("Run Benchmarks")');
    await expect(runButton).toBeVisible();
  });

  test('Benchmarks Execute Successfully', async ({ page }) => {
    // Scroll to benchmarks
    await page.locator('text=Performance Benchmarks').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Click run button
    const runButton = page.locator('button:has-text("Run Benchmarks")');
    await runButton.click();

    // Wait for benchmarks to complete
    await page.waitForTimeout(5000);

    // Verify results are displayed
    const resultsVisible = await page.locator('text=Benchmark Results').isVisible({ timeout: 5000 });
    expect(resultsVisible).toBe(true);

    // Verify score is displayed
    const scoreVisible = await page.locator('text=/\\d+%/').isVisible();
    expect(scoreVisible).toBe(true);
  });

  test('System Info is Displayed', async ({ page }) => {
    // Run benchmarks
    await page.locator('text=Performance Benchmarks').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const runButton = page.locator('button:has-text("Run Benchmarks")');
    await runButton.click();
    await page.waitForTimeout(5000);

    // Check for system info
    const systemInfoVisible = await page.locator('text=System Information').isVisible({ timeout: 5000 });
    expect(systemInfoVisible).toBe(true);

    // Check for platform info
    const platformVisible = await page.locator('text=/Platform|CPU|Memory/').isVisible();
    expect(platformVisible).toBe(true);
  });

  test('Requirements Check Works', async ({ page }) => {
    // Run benchmarks
    await page.locator('text=Performance Benchmarks').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const runButton = page.locator('button:has-text("Run Benchmarks")');
    await runButton.click();
    await page.waitForTimeout(5000);

    // Check for requirements section
    const requirementsVisible = await page.locator('text=/Requirements|Meets Minimum/').isVisible({ timeout: 5000 });
    expect(requirementsVisible).toBe(true);
  });

  test('Benchmark Results Show Pass/Fail', async ({ page }) => {
    // Run benchmarks
    await page.locator('text=Performance Benchmarks').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    const runButton = page.locator('button:has-text("Run Benchmarks")');
    await runButton.click();
    await page.waitForTimeout(5000);

    // Check for individual benchmark results
    const hasResults = await page.locator('text=/Event|Memory|Tab/').count() > 0;
    expect(hasResults).toBe(true);

    // Check for pass/fail indicators (checkmarks or X)
    const hasIndicators = await page.locator('svg').count() > 0;
    expect(hasIndicators).toBe(true);
  });
});
