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
export declare class MemoryCache<T = unknown> {
    private cache;
    private maxSize;
    private ttl?;
    constructor(maxSize?: number, ttl?: number);
    /**
     * Get value from cache
     */
    get(key: string): T | null;
    /**
     * Set value in cache
     */
    set(key: string, value: T): void;
    /**
     * Check if key exists and is valid
     */
    has(key: string): boolean;
    /**
     * Delete key from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all cache
     */
    clear(): void;
    /**
     * Get cache stats
     */
    getStats(): {
        size: number;
        maxSize: number;
        entries: {
            key: string;
            accessCount: number;
            age: number;
            lastAccessed: number;
        }[];
    };
    /**
     * Get all keys
     */
    keys(): string[];
}
