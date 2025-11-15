/**
 * Form Fill Skill
 * Fill forms and input fields on a page
 */

import { registry } from './registry';
import { getPlaywrightChromium } from '../../utils/playwright';
import { cfg } from '../../../config';

/**
 * Fill a single input field
 */
registry.register('fill_input', async (_ctx, args: { url: string; selector: string; value: string; submit?: boolean }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available. Install "playwright-core" to enable form filling.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    await page.fill(args.selector, args.value, { timeout: cfg.timeoutMs });

    if (args.submit) {
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: cfg.timeoutMs }).catch(() => {});
    }

    return {
      url: page.url(),
      selector: args.selector,
      filled: true,
      submitted: args.submit || false,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

/**
 * Fill multiple form fields
 */
registry.register('fill_form', async (_ctx, args: { url: string; fields: Array<{ selector: string; value: string }>; submitSelector?: string }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });

    const filled: Array<{ selector: string; success: boolean }> = [];
    for (const field of args.fields) {
      try {
        await page.fill(field.selector, field.value, { timeout: 5000 });
        filled.push({ selector: field.selector, success: true });
      } catch (error) {
        filled.push({ selector: field.selector, success: false });
        console.warn(`Failed to fill ${field.selector}:`, error);
      }
    }

    if (args.submitSelector) {
      try {
        await page.click(args.submitSelector, { timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: cfg.timeoutMs }).catch(() => {});
      } catch (error) {
        console.warn(`Failed to submit form:`, error);
      }
    }

    return {
      url: page.url(),
      filled,
      totalFields: args.fields.length,
      successFields: filled.filter(f => f.success).length,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

/**
 * Select option from dropdown/select
 */
registry.register('select_option', async (_ctx, args: { url: string; selector: string; value: string }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    await page.selectOption(args.selector, args.value, { timeout: cfg.timeoutMs });

    return {
      url: page.url(),
      selector: args.selector,
      selected: args.value,
      success: true,
    };
  } finally {
    await page.close();
    await browser.close();
  }
});

