/**
 * LRU (Least Recently Used) Cache implementation
 * DAY 5-6 FIX: Prevents unlimited cache growth
 */

interface CacheEntry<T> {
  value: T;
  lastAccessed: number;
}

export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private ttl?: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl?: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (this.ttl && Date.now() - entry.lastAccessed > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
    // If key exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.lastAccessed = Date.now();
      this.cache.delete(key);
      this.cache.set(key, entry);
      return;
    }

    // If cache is full, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    this.cache.set(key, {
      value,
      lastAccessed: Date.now(),
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check TTL
    if (this.ttl && Date.now() - entry.lastAccessed > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getMaxSize(): number {
    return this.maxSize;
  }

  // Clean up expired entries
  cleanup(): number {
    if (!this.ttl) return 0;
    
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Global cache instances with size limits
export const searchCache = new LRUCache<string, any>(50, 5 * 60 * 1000); // 50 entries, 5 min TTL
export const pageCache = new LRUCache<string, any>(100, 10 * 60 * 1000); // 100 entries, 10 min TTL
export const apiCache = new LRUCache<string, any>(200, 15 * 60 * 1000); // 200 entries, 15 min TTL

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    searchCache.cleanup();
    pageCache.cleanup();
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}

