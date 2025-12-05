/**
 * In-Memory LRU Cache - Tier 2
 * Fast, size-limited cache for frequently accessed data
 */
export class MemoryCache {
    cache = new Map();
    maxSize;
    ttl; // Time to live in milliseconds
    constructor(maxSize = 100, ttl) {
        this.maxSize = maxSize;
        this.ttl = ttl;
    }
    /**
     * Get value from cache
     */
    get(key) {
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
    set(key, value) {
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
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
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
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all cache
     */
    clear() {
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
    keys() {
        return Array.from(this.cache.keys());
    }
}
