/**
 * API Cache Helper
 * Utility functions to integrate API caching with services
 */

import { apiCache } from './api-cache';

/**
 * Get cached data or fetch and cache new data
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch new data
  const data = await fetchFn();

  // Cache the result
  apiCache.set(key, data, ttl);

  return data;
}

/**
 * Create a cache key from parameters
 */
export function createCacheKey(prefix: string, ...params: (string | number)[]): string {
  return `${prefix}:${params.join(':')}`;
}

/**
 * Invalidate cache by prefix
 */
export function invalidateCache(_prefix: string): void {
  // Note: This is a simple implementation
  // For production, you might want to track keys by prefix
  apiCache.clear();
}


