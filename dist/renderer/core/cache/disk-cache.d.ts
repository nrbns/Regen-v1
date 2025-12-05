/**
 * Persistent Disk Cache - Tier 2
 * Uses IndexedDB for persistent storage with TTL support
 */
export interface DiskCacheEntry<T> {
    value: T;
    timestamp: number;
    ttl?: number;
}
export declare class DiskCache<T = unknown> {
    private db;
    private initPromise;
    constructor();
    private init;
    private ensureReady;
    /**
     * Get value from disk cache
     */
    get(key: string): Promise<T | null>;
    /**
     * Set value in disk cache
     */
    set(key: string, value: T, ttl?: number): Promise<void>;
    /**
     * Delete key from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Clear all cache
     */
    clear(): Promise<void>;
    /**
     * Clean expired entries
     */
    cleanExpired(): Promise<number>;
}
