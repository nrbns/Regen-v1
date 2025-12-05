/* eslint-env node */
/**
 * Self-Healing Cache Layer
 * Automatically invalidates when X is buzzing about a topic
 */

import { searchViralDevTweets } from './twitter-search.js';
import { parallelSearch } from './scraper-parallel-production.js';

const CACHE = new Map();
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes (1800 seconds)
const BUZZ_THRESHOLD = 15; // Minimum viral tweets to consider "buzzing" (>15 as per production code)

/**
 * Check if topic is buzzing on X/Twitter
 * Production version: checks for >15 viral tweets in last hour
 */
async function isTopicBuzzing(topic) {
  try {
    // Check buzz cache first (updated by background monitor)
    const buzzKey = `buzz:${topic.toLowerCase().trim()}`;
    const buzzCount = CACHE.get(buzzKey);
    
    if (buzzCount && Date.now() - buzzCount.timestamp < 3600 * 1000) {
      // Buzz data is fresh (< 1 hour old)
      return buzzCount.count > BUZZ_THRESHOLD;
    }

    // Fallback: Check directly
    const tweets = await searchViralDevTweets(topic, {
      maxResults: 20,
      minRetweets: 50,
      hoursAgo: 1, // Last hour only
    });

    const count = tweets.length;
    
    // Cache buzz count
    CACHE.set(buzzKey, {
      count,
      timestamp: Date.now(),
    });

    return count > BUZZ_THRESHOLD;
  } catch (error) {
    console.warn('[CacheLayer] Failed to check buzz:', error.message);
    return false;
  }
}

/**
 * Get cache key from query
 */
function getCacheKey(query, options = {}) {
  const normalized = query.toLowerCase().trim();
  const optionsStr = JSON.stringify(options);
  return `research:${normalized}:${optionsStr}`;
}

/**
 * Get cached result or compute
 * Production version with buzz detection
 */
export async function getCachedOrCompute(key, computeFunc, ttl = 1800) {
  const cached = CACHE.get(key);
  
  if (cached) {
    const data = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() - data.ts * 1000 > ttl * 1000) {
      CACHE.delete(key);
    } else {
      // If topic is trending on X right now → invalidate
      const buzzKey = `buzz:${key}`;
      const buzz = CACHE.get(buzzKey);
      
      if (buzz && buzz.count > BUZZ_THRESHOLD) {
        console.log(`[CacheLayer] Cache invalidated due to buzz: ${key}`);
        CACHE.delete(key);
      } else {
        return data.result;
      }
    }
  }

  // Compute and cache
  const result = await computeFunc();
  CACHE.set(key, JSON.stringify({
    result,
    ts: Date.now() / 1000,
  }));
  
  // Set expiration
  setTimeout(() => {
    CACHE.delete(key);
  }, ttl * 1000);

  return result;
}

/**
 * Get cached result (backward compatibility)
 */
export async function getCachedResult(query, options = {}) {
  const key = getCacheKey(query, options);
  const cached = CACHE.get(key);

  if (!cached) return null;

  try {
    const data = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() - data.ts * 1000 > (options.ttl || DEFAULT_TTL)) {
      CACHE.delete(key);
      return null;
    }

    // Check if topic is buzzing (auto-invalidate)
    const isBuzzing = await isTopicBuzzing(query);
    if (isBuzzing) {
      console.log(`[CacheLayer] Topic "${query}" is buzzing on X - invalidating cache`);
      CACHE.delete(key);
      return null;
    }

    return data.result;
  } catch {
    // Old format
    if (Date.now() - cached.timestamp > cached.ttl) {
      CACHE.delete(key);
      return null;
    }
    return cached.data;
  }
}

/**
 * Set cached result
 */
export function setCachedResult(query, data, options = {}) {
  const key = getCacheKey(query, options);
  const ttl = (options.ttl || DEFAULT_TTL) / 1000; // Convert to seconds

  CACHE.set(key, JSON.stringify({
    result: data,
    ts: Date.now() / 1000,
    query,
  }));

  // Set expiration
  setTimeout(() => {
    CACHE.delete(key);
  }, ttl * 1000);

  // Cleanup old entries if cache is too large
  if (CACHE.size > 1000) {
    const entries = Array.from(CACHE.entries());
    const entriesWithTs = entries.map(([k, v]) => {
      try {
        const data = JSON.parse(v);
        return [k, data.ts || 0];
      } catch {
        return [k, 0];
      }
    });
    entriesWithTs.sort((a, b) => a[1] - b[1]);
    
    // Remove oldest 20%
    const toRemove = Math.floor(entriesWithTs.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      CACHE.delete(entriesWithTs[i][0]);
    }
  }
}

/**
 * Background buzz monitor (run in separate worker/interval)
 * Checks X for viral tweets and updates buzz cache
 */
export async function buzzMonitor() {
  // This would run in a background worker
  // For now, we check on-demand in getCachedResult
  console.log('[CacheLayer] Buzz monitor would run here in production');
}

// Start buzz monitor if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Run buzz monitor every 2 minutes
  setInterval(async () => {
    // In production, this would check all cached topics
    // For now, it's handled on-demand
  }, 2 * 60 * 1000);
}

/**
 * Invalidate cache for a query
 */
export function invalidateCache(query, options = {}) {
  const key = getCacheKey(query, options);
  CACHE.delete(key);
}

/**
 * Invalidate all cache
 */
export function clearCache() {
  CACHE.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  const entries = Array.from(CACHE.values());
  const now = Date.now();

  return {
    size: CACHE.size,
    totalSize: entries.length,
    expired: entries.filter(e => now - e.timestamp > e.ttl).length,
    valid: entries.filter(e => now - e.timestamp <= e.ttl).length,
    oldest: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
    newest: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null,
  };
}

/**
 * Warm cache for common queries
 */
export async function warmCache(queries) {
  // This would pre-fetch results for common queries
  // Implementation depends on your needs
  console.log('[CacheLayer] Cache warming not implemented yet');
}

