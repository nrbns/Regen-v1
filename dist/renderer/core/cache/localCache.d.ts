/**
 * Local Cache & Queue System
 * Enables offline agent support and deterministic operations
 */
export interface CacheEntry<T = unknown> {
    key: string;
    value: T;
    timestamp: number;
    expiresAt?: number;
    tags?: string[];
}
export interface QueueItem<T = unknown> {
    id: string;
    type: string;
    data: T;
    priority: number;
    createdAt: number;
    attempts: number;
    maxAttempts: number;
}
declare class LocalCache {
    private cache;
    private queue;
    private maxCacheSize;
    private maxQueueSize;
    private db;
    constructor(maxCacheSize?: number, maxQueueSize?: number);
    /**
     * Initialize IndexedDB for persistent cache
     */
    private initDB;
    /**
     * Load cache from IndexedDB
     */
    private loadFromDB;
    /**
     * Get value from cache
     */
    get<T = unknown>(key: string): Promise<T | null>;
    /**
     * Set value in cache
     */
    set<T = unknown>(key: string, value: T, options?: {
        ttl?: number;
        tags?: string[];
    }): Promise<void>;
    /**
     * Delete from cache
     */
    delete(key: string): Promise<void>;
    /**
     * Delete from IndexedDB
     */
    private deleteFromDB;
    /**
     * Clear cache by tags
     */
    clearByTags(tags: string[]): Promise<void>;
    /**
     * Add item to queue
     */
    enqueue<T = unknown>(type: string, data: T, options?: {
        priority?: number;
        maxAttempts?: number;
    }): Promise<string>;
    /**
     * Get next item from queue
     */
    dequeue<T = unknown>(): Promise<QueueItem<T> | null>;
    /**
     * Peek at next item without removing
     */
    peek<T = unknown>(): QueueItem<T> | null;
    /**
     * Get queue length
     */
    get queueLength(): number;
    /**
     * Clear queue
     */
    clearQueue(): Promise<void>;
    /**
     * Get cache stats
     */
    getStats(): {
        cacheSize: number;
        queueSize: number;
        memoryUsage: number;
    };
}
export declare const localCache: LocalCache;
export {};
