/* eslint-env node */
/**
 * Scrape Route
 * Robust scrape endpoint that requires `url` and returns extracted text (Readability)
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * POST /api/scrape
 * Scrape a URL and extract clean text using Readability
 */
export async function scrapeUrl(request, reply) {
  try {
    // Support both single URL and array of URLs (for backward compatibility)
    let url = request.body?.url || request.query?.url;
    const urls = request.body?.urls;

    // If urls array provided, use first URL (for backward compatibility)
    if (urls && Array.isArray(urls) && urls.length > 0) {
      url = urls[0];
    }

    if (!url) {
      return reply.code(400).send({
        error: 'missing-url',
        message:
          'URL parameter is required. Send as { url: "https://example.com" } in POST body or ?url=... in query string',
      });
    }

    // Basic fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'RegenBot/1.0 (+https://regen.example)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      return reply.code(500).send({
        error: 'fetch_failed',
        status: resp.status,
        statusText: resp.statusText,
        url,
      });
    }

    const html = await resp.text();

    // Parse with Readability
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();

    const payload = {
      url,
      title: article?.title || dom.window.document.title || null,
      excerpt: article?.excerpt || null,
      text: article?.textContent || dom.window.document.body?.textContent || '',
      rawHtml: process.env.SCRAPE_RETURN_HTML === '1' ? html : undefined,
    };

    return reply.send({
      ok: true,
      page: payload,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      return reply.code(504).send({
        error: 'timeout',
        message: 'Request timed out after 15 seconds',
      });
    }
    console.error('[scrape] error', err.message || err);
    return reply.code(500).send({
      error: 'scrape_failed',
      message: err.message || String(err),
    });
  }
}
