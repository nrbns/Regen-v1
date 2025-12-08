/**
 * Cache Layer
 * Provides in-memory caching with NodeCache (fallback to Map if unavailable)
 * Supports TTL, cache invalidation, and metrics
 */
interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
/**
 * Create a cache instance
 */
export declare function createCache(options?: CacheOptions): any;
/**
 * Search result cache (1 hour TTL)
 */
export declare const searchCache: any;
/**
 * Summary cache (24 hour TTL - summaries don't change often)
 */
export declare const summaryCache: any;
/**
 * Extracted content cache (6 hour TTL)
 */
export declare const contentCache: any;
/**
 * Generate cache key for search query
 */
export declare function getSearchCacheKey(query: string, lang?: string, options?: Record<string, any>): string;
/**
 * Generate cache key for summary
 */
export declare function getSummaryCacheKey(urls: string[]): string;
/**
 * Generate cache key for extracted content
 */
export declare function getContentCacheKey(url: string): string;
/**
 * Default cache instance (for backward compatibility)
 */
export declare const cache: any;
export {};
