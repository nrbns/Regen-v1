/**
 * Screenshot Skill
 * Take screenshots of pages or elements
 */

import { registry } from './registry';
import { getPlaywrightChromium } from '../../utils/playwright';
import { cfg } from '../../../config';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { app } from 'electron';

/**
 * Take a full page screenshot
 */
registry.register('screenshot', async (_ctx, args: { url: string; selector?: string; fullPage?: boolean; format?: 'png' | 'jpeg' }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available. Install "playwright-core" to enable screenshots.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });

    // Wait a bit for any dynamic content
    await page.waitForTimeout(1000);

    const format = args.format || 'png';
    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    
    // Ensure directory exists
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `screenshot-${Date.now()}.${format}`;
    const filepath = path.join(screenshotsDir, filename);

    if (args.selector) {
      // Screenshot specific element
      const element = await page.locator(args.selector).first();
      await element.screenshot({ path: filepath, type: format });
    } else {
      // Full page or viewport screenshot
      await page.screenshot({
        path: filepath,
        fullPage: args.fullPage !== false,
        type: format,
      });
    }

    return {
      url: page.url(),
      filepath,
      filename,
      format,
      success: true,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

/**
 * Take multiple screenshots (e.g., for comparison or documentation)
 */
registry.register('screenshot_multiple', async (_ctx, args: { url: string; selectors: string[]; format?: 'png' | 'jpeg' }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    await page.waitForTimeout(1000);

    const format = args.format || 'png';
    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const screenshots: Array<{ selector: string; filepath: string; success: boolean }> = [];
    const timestamp = Date.now();

    for (let i = 0; i < args.selectors.length; i++) {
      const selector = args.selectors[i];
      try {
        const filename = `screenshot-${timestamp}-${i}.${format}`;
        const filepath = path.join(screenshotsDir, filename);
        
        const element = await page.locator(selector).first();
        await element.screenshot({ path: filepath, type: format });
        
        screenshots.push({ selector, filepath, success: true });
      } catch (error) {
        screenshots.push({ selector, filepath: '', success: false });
        console.warn(`Failed to screenshot ${selector}:`, error);
      }
    }

    return {
      url: page.url(),
      screenshots,
      total: args.selectors.length,
      successCount: screenshots.filter(s => s.success).length,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

