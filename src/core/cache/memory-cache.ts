/**
 * In-Memory LRU Cache - Tier 2
 * Fast, size-limited cache for frequently accessed data
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl?: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl?: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Remove if exists
    this.cache.delete(key);

    // Add new entry
    const now = Date.now();
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
    });

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp,
        lastAccessed: entry.lastAccessed,
      })),
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

