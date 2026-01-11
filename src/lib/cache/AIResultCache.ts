/**
 * AI Result Cache - Session-based result caching for AI responses
 * PERFORMANCE: Reduces redundant AI calls, saves RAM and API costs
 */

interface CachedResult {
  key: string;
  result: any;
  timestamp: number;
  sessionId: string;
}

class AIResultCache {
  private cache = new Map<string, CachedResult>();
  private readonly maxSize = 50; // Max cached results
  private readonly maxAge = 10 * 60 * 1000; // 10 minutes TTL

  /**
   * Get cached result by key
   * @returns Cached result or null if not found/expired
   */
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Set cached result
   * Automatically evicts oldest entry if at max size
   */
  set(key: string, result: any, sessionId: string = 'default'): void {
    // Evict oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      sessionId,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cached results for a specific session
   */
  clearSession(sessionId: string): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.sessionId === sessionId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      maxAge: this.maxAge,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const aiResultCache = new AIResultCache();

// Auto-cleanup every 5 minutes
setInterval(() => aiResultCache.cleanup(), 5 * 60 * 1000);
