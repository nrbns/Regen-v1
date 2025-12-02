import { validateUrlForAgent } from '../core/security/urlSafety';
import { log } from '../utils/logger';

const API_BASE =
  (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '') ||
  import.meta.env.VITE_APP_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

export interface ScrapeSourcePayload {
  urls: string[];
  allow_render?: boolean;
  use_cache?: boolean;
  selectors?: string[];
  max_chars?: number;
}

export interface ScrapedSourceResult {
  url: string;
  finalUrl?: string;
  status?: number;
  title?: string;
  description?: string;
  image?: string;
  excerpt?: string;
  content?: string;
  wordCount?: number;
  lang?: string;
  contentHash?: string;
  rendered?: boolean;
  fromCache?: boolean;
  fetchedAt?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

interface BackendScrapeResponse {
  results: Array<{
    url: string;
    final_url?: string;
    status?: number;
    title?: string;
    description?: string;
    image?: string;
    excerpt?: string;
    content?: string;
    word_count?: number;
    lang?: string;
    content_hash?: string;
    rendered?: boolean;
    from_cache?: boolean;
    fetched_at?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export async function scrapeResearchSources(
  urls: string[],
  _options: Omit<ScrapeSourcePayload, 'urls'> = {}
): Promise<ScrapedSourceResult[]> {
  if (!API_BASE || urls.length === 0) {
    return [];
  }

  // Tier 1: Security guardrails - validate all URLs before scraping
  const safeUrls: string[] = [];
  const blockedUrls: Array<{ url: string; reason: string }> = [];

  for (const url of urls) {
    const validation = validateUrlForAgent(url);
    if (validation.safe) {
      safeUrls.push(url);
    } else {
      blockedUrls.push({ url, reason: validation.reason || 'Unsafe URL' });
      log.warn('[Scraper] Blocked unsafe URL', { url, reason: validation.reason });
    }
  }

  // If all URLs are blocked, return empty with error info
  if (safeUrls.length === 0) {
    if (blockedUrls.length > 0) {
      log.error('[Scraper] All URLs blocked by security check', blockedUrls);
    }
    return blockedUrls.map(({ url, reason }) => ({
      url,
      error: reason || 'URL blocked by security policy',
    }));
  }

  // If some URLs are blocked, log warning but continue with safe ones
  if (blockedUrls.length > 0) {
    log.warn('[Scraper] Some URLs blocked, proceeding with safe URLs', {
      blocked: blockedUrls.length,
      safe: safeUrls.length,
    });
  }

  try {
    // Scrape each URL individually (new route format expects single URL)
    const results: ScrapedSourceResult[] = [];

    for (const url of safeUrls) {
      try {
        const response = await fetch(`${API_BASE.replace(/\/$/, '')}/api/scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }), // Send single URL
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'unknown' }));
          console.warn('[Scraper] Backend returned error for', url, response.status, errorData);
          results.push({
            url,
            error: errorData.error || errorData.message || 'Scrape failed',
          });
          continue;
        }

        const payload = await response.json();

        // Handle new route format: { ok: true, page: {...} }
        if (payload.ok && payload.page) {
          results.push({
            url: payload.page.url || url,
            title: payload.page.title,
            excerpt: payload.page.excerpt,
            content: payload.page.text,
            wordCount: payload.page.text?.split(/\s+/).length || 0,
            lang: 'auto', // Language detection can be added later
          });
        } else {
          // Fallback: try to parse as old format
          const oldFormat = payload as BackendScrapeResponse;
          if (oldFormat.results && oldFormat.results.length > 0) {
            const result = oldFormat.results[0];
            results.push({
              url: result.url,
              finalUrl: result.final_url,
              status: result.status,
              title: result.title,
              description: result.description,
              image: result.image,
              excerpt: result.excerpt,
              content: result.content,
              wordCount: result.word_count,
              lang: result.lang,
              contentHash: result.content_hash,
              rendered: result.rendered,
              fromCache: result.from_cache,
              fetchedAt: result.fetched_at,
              metadata: result.metadata,
            });
          } else {
            results.push({
              url,
              error: 'Unexpected response format',
            });
          }
        }
      } catch (error) {
        console.warn('[Scraper] Failed to scrape', url, error);
        results.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.warn('[Scraper] Failed to fetch sources', error);
    return [];
  }
}
