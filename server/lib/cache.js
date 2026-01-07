/* eslint-env node */
/**
 * Cache Layer
 * Provides in-memory caching with NodeCache (fallback to Map if unavailable)
 * Supports TTL, cache invalidation, and metrics
 */
class SimpleCache {
  cache;
  maxSize;
  defaultTTL;
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = (options.ttl || 3600) * 1000; // Convert to milliseconds
    this.maxSize = options.maxSize || 1000;
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value, ttl) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    const expiresAt = Date.now() + (ttl ? ttl * 1000 : this.defaultTTL);
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for real hit rate
    };
  }
}
// Try to use NodeCache if available, otherwise fallback to SimpleCache
let CacheImplementation;
try {
  const NodeCache = require('node-cache');
  CacheImplementation = NodeCache;
} catch {
  // Fallback to simple in-memory cache
  CacheImplementation = SimpleCache;
}
/**
 * Create a cache instance
 */
export function createCache(options = {}) {
  if (CacheImplementation === SimpleCache) {
    return new SimpleCache(options);
  }
  // Use NodeCache
  return new CacheImplementation({
    stdTTL: options.ttl || 3600,
    maxKeys: options.maxSize || 1000,
    useClones: false, // Better performance
  });
}
/**
 * Search result cache (1 hour TTL)
 */
export const searchCache = createCache({ ttl: 3600, maxSize: 500 });
/**
 * Summary cache (24 hour TTL - summaries don't change often)
 */
export const summaryCache = createCache({ ttl: 86400, maxSize: 200 });
/**
 * Extracted content cache (6 hour TTL)
 */
export const contentCache = createCache({ ttl: 21600, maxSize: 1000 });
/**
 * Generate cache key for search query
 */
export function getSearchCacheKey(query, lang, options) {
  const normalized = query.trim().toLowerCase();
  const optStr = options ? JSON.stringify(options) : '';
  return `search:${normalized}:${lang || 'auto'}:${optStr}`;
}
/**
 * Generate cache key for summary
 */
export function getSummaryCacheKey(urls) {
  const sorted = [...urls].sort().join(',');
  const hash = Buffer.from(sorted).toString('base64').slice(0, 32);
  return `summary:${hash}`;
}
/**
 * Generate cache key for extracted content
 */
export function getContentCacheKey(url) {
  const normalized = new URL(url).href;
  const hash = Buffer.from(normalized).toString('base64').slice(0, 32);
  return `content:${hash}`;
}
/**
 * Default cache instance (for backward compatibility)
 */
export const cache = searchCache;
