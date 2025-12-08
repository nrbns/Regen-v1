/* eslint-env node */
/**
 * Content Extraction
 * Extracts clean text from HTML using cheerio and Mozilla Readability
 * Handles canonical URLs, deduplication, and sanitization
 */

import fetch from 'node-fetch';
import { extractContent as existingExtractContent } from '../services/research/extractContent.js';

interface ExtractOptions {
  timeout?: number;
  userAgent?: string;
  maxLength?: number;
  extractMetadata?: boolean;
}

interface ExtractedContent {
  url: string;
  canonicalUrl?: string;
  title: string;
  text: string;
  excerpt?: string;
  lang?: string;
  metadata?: {
    author?: string;
    publishedTime?: string;
    description?: string;
    image?: string;
  };
  error?: string;
}

let cheerio: any = null;
let Readability: any = null;
let JSDOM: any = null;

// Lazy load dependencies
async function loadDependencies() {
  if (!cheerio) {
    try {
      const cheerioModule = await import('cheerio');
      cheerio = 'default' in cheerioModule ? cheerioModule.default : cheerioModule;
    } catch {
      console.warn('[Extractors] cheerio not available, using fallback extraction');
    }
  }

  if (!Readability) {
    try {
      const readabilityModule = await import('@mozilla/readability');
      Readability = readabilityModule.Readability;
    } catch {
      console.warn('[Extractors] @mozilla/readability not available');
    }
  }

  if (!JSDOM) {
    try {
      const jsdomModule = await import('jsdom');
      JSDOM = jsdomModule.JSDOM;
    } catch {
      console.warn('[Extractors] jsdom not available, using fallback');
    }
  }
}

/**
 * Extract canonical URL from HTML
 */
function extractCanonicalUrl(html: string, baseUrl: string): string | undefined {
  if (!cheerio) return undefined;

  try {
    const $ = cheerio.load(html);
    const canonical = $('link[rel="canonical"]').attr('href') ||
                     $('meta[property="og:url"]').attr('content');
    
    if (canonical) {
      try {
        return new URL(canonical, baseUrl).href;
      } catch {
        return undefined;
      }
    }
  } catch {
    // Fallback
  }

  return undefined;
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(html: string): ExtractedContent['metadata'] {
  if (!cheerio) return undefined;

  try {
    const $ = cheerio.load(html);
    
    return {
      author: $('meta[name="author"]').attr('content') ||
              $('meta[property="article:author"]').attr('content') ||
              $('[rel="author"]').text().trim() ||
              undefined,
      publishedTime: $('meta[property="article:published_time"]').attr('content') ||
                     $('time[datetime]').attr('datetime') ||
                     undefined,
      description: $('meta[name="description"]').attr('content') ||
                   $('meta[property="og:description"]').attr('content') ||
                   undefined,
      image: $('meta[property="og:image"]').attr('content') ||
             $('meta[name="twitter:image"]').attr('content') ||
             undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Remove navigation, ads, and other noise from HTML
 */
function cleanHtml(html: string, $?: any): string {
  if (!$ && !cheerio) return html;
  
  try {
    const $el = $ || cheerio.load(html);
    
    // Remove common noise elements
    $el('nav, header, footer, aside, .sidebar, .ad, .advertisement, .ads, [class*="ad-"], [id*="ad-"]').remove();
    $el('script, style, noscript, iframe, embed, object').remove();
    $el('[class*="comment"], [class*="social"], [class*="share"]').remove();
    $el('[class*="newsletter"], [class*="subscribe"], [class*="popup"]').remove();
    
    return $el.html() || html;
  } catch {
    return html;
  }
}

/**
 * Extract main article content using Readability or fallback
 */
async function extractArticleContent(html: string, url: string): Promise<{ title: string; text: string; excerpt?: string }> {
  await loadDependencies();

  // Try Readability first (best quality)
  if (Readability && JSDOM) {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article && article.textContent) {
        const excerpt = article.excerpt || article.textContent.slice(0, 200) + '...';
        return {
          title: article.title || '',
          text: article.textContent || article.content || '',
          excerpt,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[Extractors] Readability failed for ${url}, using fallback:`, errorMessage);
    }
  }

  // Fallback: use cheerio to extract main content
  if (cheerio) {
    try {
      const cleaned = cleanHtml(html);
      const $ = cheerio.load(cleaned);
      
      // Try to find main content area
      let mainContent = $('main, article, [role="main"], .content, .post, .entry-content, #content').first();
      
      if (mainContent.length === 0) {
        // Fallback to body
        mainContent = $('body');
      }

      // Remove remaining noise
      mainContent.find('nav, header, footer, aside, .sidebar, .ad, script, style').remove();

      const text = mainContent.text()
        .replace(/\s+/g, ' ')
        .trim();

      const title = $('title').text().trim() ||
                    $('h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') ||
                    '';

      const excerpt = text.slice(0, 200) + (text.length > 200 ? '...' : '');

      return { title, text, excerpt };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[Extractors] Cheerio extraction failed for ${url}:`, errorMessage);
    }
  }

  // Last resort: basic text extraction
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, text, excerpt: text.slice(0, 200) + '...' };
}

/**
 * Extract content from a URL with full pipeline
 */
export async function extractContent(
  url: string,
  options: ExtractOptions = {}
): Promise<ExtractedContent> {
  const {
    timeout = 10000,
    userAgent = 'RegenBot/1.0 (Mozilla/5.0 compatible)',
    maxLength = 50000,
    extractMetadata: shouldExtractMetadata = true,
  } = options;

  try {
    // Fetch HTML
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        url,
        title: '',
        text: '',
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    
    await loadDependencies();

    // Extract canonical URL
    const canonicalUrl = extractCanonicalUrl(html, url);

    // Extract metadata if requested
    const metadata = shouldExtractMetadata ? extractMetadata(html) : undefined;

    // Extract article content
    const { title, text, excerpt } = await extractArticleContent(html, url);

    // Truncate if too long
    const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;

    // Detect language (basic - could enhance)
    const lang = detectLanguageFromText(truncatedText);

    return {
      url: canonicalUrl || url,
      canonicalUrl,
      title: title || url,
      text: truncatedText,
      excerpt,
      lang,
      metadata,
    };
  } catch (error: any) {
    // Fallback to existing extractor
    try {
      const fallback = await existingExtractContent(url, { timeout, userAgent });
      return {
        url: fallback.url,
        title: fallback.title,
        text: fallback.text,
        lang: fallback.lang,
        error: fallback.error || undefined,
      };
    } catch {
      return {
        url,
        title: '',
        text: '',
        error: error.message || 'Unknown error',
      };
    }
  }
}

/**
 * Extract content from multiple URLs in parallel
 */
export async function extractMultipleContent(
  urls: string[],
  options: ExtractOptions & { concurrency?: number } = {}
): Promise<ExtractedContent[]> {
  const { concurrency = 4, ...extractOptions } = options;

  const results: ExtractedContent[] = [];
  const executing: Promise<void>[] = [];

  for (const url of urls) {
    const promise = extractContent(url, extractOptions)
      .then(result => {
        results.push(result);
      })
      .catch(error => {
        results.push({
          url,
          title: '',
          text: '',
          error: error.message,
        });
      })
      .finally(() => {
        const index = executing.indexOf(promise);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  return results;
}

/**
 * Simple language detection from text
 */
function detectLanguageFromText(text: string): string {
  // Very basic detection - could enhance with franc or similar
  if (text.length < 50) return 'en';

  // Check for common non-English characters
  const hasCyrillic = /[а-яА-Я]/.test(text);
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasHindi = /[\u0900-\u097F]/.test(text);

  if (hasChinese) return 'zh';
  if (hasArabic) return 'ar';
  if (hasHindi) return 'hi';
  if (hasCyrillic) return 'ru';

  return 'en'; // Default
}


