/**
 * Unified Cache Manager - Tier 2
 * Multi-layer cache: memory (LRU) + disk (persistent)
 */
export interface CacheOptions {
    ttl?: number;
    useDisk?: boolean;
    useMemory?: boolean;
}
export declare class CacheManager {
    private memoryCache;
    private diskCache;
    private defaultOptions;
    constructor(memorySize?: number, defaultOptions?: CacheOptions);
    /**
     * Get value from cache (checks memory first, then disk)
     */
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    /**
     * Set value in cache (writes to both memory and disk)
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Check if key exists
     */
    has(key: string, options?: CacheOptions): Promise<boolean>;
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
    /**
     * Get cache statistics
     */
    getStats(): {
        memory: {
            size: number;
            maxSize: number;
            entries: {
                key: string;
                accessCount: number;
                age: number;
                lastAccessed: number;
            }[];
        };
    };
}
export declare const cacheManager: CacheManager;
