import { registry } from './registry';
import { extractFirstTable } from '../../extractors/table';
import { chromium } from 'playwright-core';
import { cfg } from '../../../config';

async function fetchHtml(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: cfg.userAgent });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: cfg.timeoutMs });
    const html = await page.content();
    return html;
  } finally {
    await page.close();
    await browser.close();
  }
}

registry.register('extract_table', async (_ctx, args: { url: string }) => {
  const html = await fetchHtml(args.url);
  const { headers, rows } = extractFirstTable(html);
  return { headers, rows, count: rows.length };
});


