/**
 * Scrape Deduplication - Tier 2
 * Hash-based deduplication to avoid re-scraping same content
 */
/**
 * Generate hash for URL + content using Web Crypto API or fallback
 */
export declare function generateContentHash(url: string, content: string): Promise<string>;
/**
 * Check if content has been scraped before
 */
export declare function isDuplicate(url: string, content: string): Promise<boolean>;
/**
 * Mark content as scraped
 */
export declare function markAsScraped(url: string, content: string, result: unknown): Promise<void>;
/**
 * Get cached scrape result if exists
 */
export declare function getCachedScrape(url: string, content: string): Promise<unknown | null>;
