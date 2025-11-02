import { chromium, Page } from 'playwright-core';
import { cfg } from '../config';

async function withPage<T>(fn: (page: Page)=>Promise<T>) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });
  try {
    return await fn(page);
  } finally {
    await page.close();
    await browser.close();
  }
}

export async function navigate(url: string) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'load', timeout: cfg.timeoutMs });
    return { url: page.url(), title: await page.title() };
  });
}

export async function findAndClick(url: string, selectorOrText: { selector?: string; text?: string }) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    if (selectorOrText.selector) {
      await page.click(selectorOrText.selector, { timeout: cfg.timeoutMs });
    } else if (selectorOrText.text) {
      const locator = page.getByText(selectorOrText.text, { exact: false });
      await locator.first().click({ timeout: cfg.timeoutMs });
    }
    return { url: page.url() };
  });
}

export async function typeInto(url: string, target: { selector: string; text: string; submit?: boolean }) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    await page.fill(target.selector, target.text, { timeout: cfg.timeoutMs });
    if (target.submit) await page.keyboard.press('Enter');
    await page.waitForLoadState('load', { timeout: cfg.timeoutMs }).catch(()=>{});
    return { url: page.url() };
  });
}

export async function waitFor(url: string, wait: { selector?: string; ms?: number }) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    if (wait.selector) {
      await page.waitForSelector(wait.selector, { timeout: cfg.timeoutMs });
    } else if (wait.ms) {
      await page.waitForTimeout(wait.ms);
    }
    return { url: page.url() };
  });
}

export async function scroll(url: string, opt: { to?: 'bottom'|'top'; pixels?: number }) {
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    if (opt.to === 'bottom') {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else if (opt.to === 'top') {
      await page.evaluate(() => window.scrollTo(0, 0));
    } else if (opt.pixels) {
      await page.evaluate((p) => window.scrollBy(0, p), opt.pixels);
    }
    return { url: page.url() };
  });
}


