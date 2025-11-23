/**
 * Unified Cache Manager - Tier 2
 * Multi-layer cache: memory (LRU) + disk (persistent)
 */

import { MemoryCache } from './memory-cache';
import { DiskCache } from './disk-cache';
import { log } from '../../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  useDisk?: boolean; // Whether to use disk cache
  useMemory?: boolean; // Whether to use memory cache
}

export class CacheManager {
  private memoryCache: MemoryCache;
  private diskCache: DiskCache;
  private defaultOptions: CacheOptions;

  constructor(
    memorySize: number = 100,
    defaultOptions: CacheOptions = {
      ttl: 3600000, // 1 hour default
      useDisk: true,
      useMemory: true,
    }
  ) {
    this.memoryCache = new MemoryCache(memorySize, defaultOptions.ttl);
    this.diskCache = new DiskCache();
    this.defaultOptions = defaultOptions;

    // Clean expired entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.cleanExpired().catch(error => {
          log.warn('Failed to clean expired cache entries', error);
        });
      }, 300000); // Every 5 minutes
    }
  }

  /**
   * Get value from cache (checks memory first, then disk)
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const opts = { ...this.defaultOptions, ...options };

    // Check memory cache first
    if (opts.useMemory) {
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue !== null && memoryValue !== undefined) {
        log.debug(`Cache hit (memory): ${key}`);
        return memoryValue as T;
      }
    }

    // Check disk cache
    if (opts.useDisk) {
      try {
        const diskValue = await this.diskCache.get(key);
        if (diskValue !== null && diskValue !== undefined) {
          log.debug(`Cache hit (disk): ${key}`);
          // Populate memory cache
          if (opts.useMemory) {
            this.memoryCache.set(key, diskValue);
          }
          return diskValue as T;
        }
      } catch (error) {
        log.warn(`Failed to read from disk cache: ${key}`, error);
      }
    }

    log.debug(`Cache miss: ${key}`);
    return null;
  }

  /**
   * Set value in cache (writes to both memory and disk)
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    // Write to memory cache
    if (opts.useMemory) {
      this.memoryCache.set(key, value);
    }

    // Write to disk cache
    if (opts.useDisk) {
      try {
        await this.diskCache.set(key, value, opts.ttl);
      } catch (error) {
        log.warn(`Failed to write to disk cache: ${key}`, error);
      }
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string, options?: CacheOptions): Promise<boolean> {
    const opts = { ...this.defaultOptions, ...options };

    if (opts.useMemory && this.memoryCache.has(key)) {
      return true;
    }

    if (opts.useDisk) {
      const value = await this.get(key, options);
      return value !== null;
    }

    return false;
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await this.diskCache.delete(key);
    } catch (error) {
      log.warn(`Failed to delete from disk cache: ${key}`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      await this.diskCache.clear();
    } catch (error) {
      log.warn('Failed to clear disk cache', error);
    }
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    try {
      return await this.diskCache.cleanExpired();
    } catch (error) {
      log.warn('Failed to clean expired cache entries', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();
