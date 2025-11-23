/**
 * Scrape Deduplication - Tier 2
 * Hash-based deduplication to avoid re-scraping same content
 */

import { cacheManager } from './cache-manager';
import { log } from '../../utils/logger';

const DEDUPE_PREFIX = 'scrape:dedupe:';
const DEDUPE_TTL = 86400000; // 24 hours

/**
 * Generate hash for URL + content using Web Crypto API or fallback
 */
export async function generateContentHash(url: string, content: string): Promise<string> {
  const data = `${url}:${content}`;

  // Use Web Crypto API if available (browser)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.slice(0, 16);
    } catch (error) {
      // Fallback if Web Crypto API fails
      log.warn('[Dedupe] Web Crypto API failed, using fallback hash', error);
    }
  }

  // Fallback hash function (browser-compatible)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 16);
}

/**
 * Check if content has been scraped before
 */
export async function isDuplicate(url: string, content: string): Promise<boolean> {
  const hash = await generateContentHash(url, content);
  const cacheKey = `${DEDUPE_PREFIX}${hash}`;
  const cached = await cacheManager.get(cacheKey);
  return cached !== null;
}

/**
 * Mark content as scraped
 */
export async function markAsScraped(url: string, content: string, result: unknown): Promise<void> {
  const hash = await generateContentHash(url, content);
  const cacheKey = `${DEDUPE_PREFIX}${hash}`;
  await cacheManager.set(cacheKey, { url, scrapedAt: Date.now(), result }, { ttl: DEDUPE_TTL });
  log.debug(`Marked as scraped: ${url} (hash: ${hash})`);
}

/**
 * Get cached scrape result if exists
 */
export async function getCachedScrape(url: string, content: string): Promise<unknown | null> {
  const hash = await generateContentHash(url, content);
  const cacheKey = `${DEDUPE_PREFIX}${hash}`;
  const cached = await cacheManager.get<{ url: string; scrapedAt: number; result: unknown }>(
    cacheKey
  );
  return cached?.result ?? null;
}
