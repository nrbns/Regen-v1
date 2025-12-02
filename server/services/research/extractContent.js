/* eslint-env node */
/**
 * Content Extraction
 * Fetches pages and extracts clean text using Readability or fallback methods
 */

import { detectLanguage } from '../lang/detect.js';

/**
 * Check if page needs JavaScript rendering (Puppeteer)
 */
function needsJsRendered(html) {
  // Simple heuristic: check for common JS frameworks
  const jsIndicators = [
    /<script[^>]*src[^>]*react/i,
    /<script[^>]*src[^>]*vue/i,
    /<script[^>]*src[^>]*angular/i,
    /__NEXT_DATA__/i,
    /window\.__INITIAL_STATE__/i,
    html.includes('<noscript>') && html.includes('<script'),
  ];

  return jsIndicators.some(pattern => pattern.test(html));
}

/**
 * Extract content from a URL
 * Uses Readability if available, falls back to simple text extraction
 * Supports Puppeteer for JS-heavy pages
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} - { url, title, text, lang, error }
 */
export async function extractContent(url, options = {}) {
  const { timeout = 10000, userAgent = 'RegenBot/1.0', usePuppeteer = false } = options;

  try {
    // Fetch page
    let html = '';

    // Try Puppeteer if needed and enabled
    if (usePuppeteer || process.env.USE_PUPPETEER === 'true') {
      try {
        const puppeteer = await import('puppeteer').catch(() => null);
        if (puppeteer) {
          const browser = await puppeteer.default.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
          });
          const page = await browser.newPage();
          await page.setUserAgent(userAgent);
          await page.goto(url, { waitUntil: 'networkidle2', timeout: timeout });
          html = await page.content();
          await browser.close();
        }
      } catch (puppeteerError) {
        console.warn(
          `[ExtractContent] Puppeteer failed for ${url}, falling back to fetch:`,
          puppeteerError.message
        );
      }
    }

    // Fallback to fetch if Puppeteer not used or failed
    if (!html) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          url,
          title: '',
          text: '',
          lang: 'unknown',
          error: `HTTP ${response.status}`,
        };
      }

      html = await response.text();

      // Check if we need Puppeteer for this page
      if (!usePuppeteer && needsJsRendered(html) && process.env.USE_PUPPETEER === 'true') {
        // Retry with Puppeteer
        try {
          const puppeteer = await import('puppeteer').catch(() => null);
          if (puppeteer) {
            const browser = await puppeteer.default.launch({
              args: ['--no-sandbox', '--disable-setuid-sandbox'],
              headless: true,
            });
            const page = await browser.newPage();
            await page.setUserAgent(userAgent);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: timeout });
            html = await page.content();
            await browser.close();
          }
        } catch {
          // Continue with HTML from fetch
        }
      }
    }

    // Try to use Readability if available
    let title = '';
    let text = '';

    try {
      // Dynamic import for Readability (optional dependency)
      const { Readability } = await import('@mozilla/readability');
      const { JSDOM } = await import('jsdom');

      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article) {
        title = article.title || '';
        text = article.textContent || article.content || '';
      }
    } catch {
      // Fallback to simple extraction
      console.warn(`[ExtractContent] Readability not available for ${url}, using fallback`);
    }

    // Fallback: simple text extraction
    if (!text) {
      try {
        const { JSDOM } = await import('jsdom');
        const dom = new JSDOM(html, { url });
        const body = dom.window.document.body;

        // Remove script and style elements
        const scripts = body.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());

        text = body.textContent || body.innerText || '';
        title = dom.window.document.title || '';
      } catch {
        // Last resort: regex extraction
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = titleMatch ? titleMatch[1] : '';

        // Remove HTML tags
        text = html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    // Clean up text
    text = text.replace(/\s+/g, ' ').trim();

    // Detect language
    const lang = detectLanguage(text || title || '', 'auto').language || 'en';

    return {
      url,
      title: title || url,
      text,
      lang,
      error: null,
    };
  } catch (error) {
    return {
      url,
      title: '',
      text: '',
      lang: 'unknown',
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Extract content from multiple URLs in parallel with concurrency limit
 *
 * @param {Array<{url: string, title?: string, snippet?: string}>} sources - Array of source objects
 * @param {Object} options - Extraction options
 * @param {number} options.concurrency - Max concurrent fetches (default: 4)
 * @returns {Promise<Array>} - Array of extracted content objects
 */
export async function extractMultipleContent(sources, options = {}) {
  const { concurrency = 4 } = options;

  // Simple concurrency control
  const results = [];
  const _executing = [];

  for (const source of sources) {
    const promise = extractContent(source.url, options).then(result => {
      // Merge with original source data
      return {
        ...result,
        source: source.source || 'unknown',
        snippet: source.snippet || '',
        originalTitle: source.title || result.title,
      };
    });

    results.push(promise);

    if (results.length >= concurrency) {
      await Promise.race(results.slice(-concurrency));
    }
  }

  return Promise.all(results);
}
