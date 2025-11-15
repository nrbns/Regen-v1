/**
 * Click Skill
 * Click elements on a page by selector or text
 */

import { registry } from './registry';
import { getPlaywrightChromium } from '../../utils/playwright';
import { cfg } from '../../../config';

/**
 * Click an element on a page
 */
registry.register('click', async (_ctx, args: { url: string; selector?: string; text?: string; waitForNavigation?: boolean }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available. Install "playwright-core" to enable clicking.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });

    if (args.selector) {
      await page.click(args.selector, { timeout: cfg.timeoutMs });
    } else if (args.text) {
      const locator = page.getByText(args.text, { exact: false });
      await locator.first().click({ timeout: cfg.timeoutMs });
    } else {
      throw new Error('Either selector or text must be provided');
    }

    if (args.waitForNavigation) {
      await page.waitForLoadState('networkidle', { timeout: cfg.timeoutMs }).catch(() => {});
    }

    return {
      url: page.url(),
      title: await page.title(),
      success: true,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

/**
 * Click multiple elements (e.g., checkboxes, buttons)
 */
registry.register('click_multiple', async (_ctx, args: { url: string; selectors: string[] }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });

    const clicked: string[] = [];
    for (const selector of args.selectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        clicked.push(selector);
      } catch (error) {
        // Continue with next selector if one fails
        console.warn(`Failed to click ${selector}:`, error);
      }
    }

    return {
      url: page.url(),
      clicked,
      total: args.selectors.length,
      success: clicked.length > 0,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

