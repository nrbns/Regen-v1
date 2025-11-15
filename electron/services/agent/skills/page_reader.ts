/**
 * Page Reader Skill
 * Extract readable content from web pages
 */

import { registry } from './registry';
import { getPlaywrightChromium } from '../../utils/playwright';
import { cfg } from '../../../config';

/**
 * Read page content and extract structured data
 */
registry.register('read_page', async (_ctx, args: { url: string; extractText?: boolean; extractHtml?: boolean }) => {
  const chromium = getPlaywrightChromium();
  if (!chromium) {
    throw new Error('Playwright automation is not available. Install "playwright-core" to enable page reading.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });

  try {
    await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });

    const result: {
      url: string;
      title: string;
      text?: string;
      html?: string;
      metadata?: Record<string, unknown>;
    } = {
      url: page.url(),
      title: await page.title(),
    };

    if (args.extractText !== false) {
      // Extract readable text content
      result.text = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());

        // Get main content areas
        const main = document.querySelector('main, article, [role="main"]') || document.body;
        return (main as HTMLElement).innerText || main.textContent || '';
      });
    }

    if (args.extractHtml) {
      // Extract clean HTML
      result.html = await page.evaluate(() => {
        const main = document.querySelector('main, article, [role="main"]') || document.body;
        return main.innerHTML;
      });
    }

    // Extract metadata
    result.metadata = await page.evaluate(() => {
      const meta: Record<string, unknown> = {};
      
      // Meta tags
      document.querySelectorAll('meta').forEach(el => {
        const name = el.getAttribute('name') || el.getAttribute('property');
        const content = el.getAttribute('content');
        if (name && content) {
          meta[name] = content;
        }
      });

      // Open Graph
      const og: Record<string, string> = {};
      document.querySelectorAll('meta[property^="og:"]').forEach(el => {
        const prop = el.getAttribute('property');
        const content = el.getAttribute('content');
        if (prop && content) {
          og[prop] = content;
        }
      });
      if (Object.keys(og).length > 0) {
        meta.openGraph = og;
      }

      // Links
      const links: Array<{ rel: string; href: string }> = [];
      document.querySelectorAll('link[rel]').forEach(el => {
        const rel = el.getAttribute('rel');
        const href = el.getAttribute('href');
        if (rel && href) {
          links.push({ rel, href });
        }
      });
      if (links.length > 0) {
        meta.links = links;
      }

      return meta;
    });

    return result;
  } finally {
    await page.close();
    await browser.close();
  }
});

