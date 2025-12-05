/**
 * LRU Cache for Embeddings - Future Enhancement #2
 * Advanced caching with Least Recently Used eviction
 * Prevents memory bloat while keeping frequently used embeddings hot
 */
export interface CachedEmbedding {
    text: string;
    vector: number[];
    model: string;
    timestamp: number;
    hash: string;
    accessCount: number;
    lastAccessed: number;
}
/**
 * LRU Cache implementation for embeddings
 * Evicts least recently used items when capacity is reached
 */
declare class LRUCache {
    private capacity;
    private cache;
    private head;
    private tail;
    private diskCache;
    constructor(capacity?: number);
    /**
     * Get embedding from cache (promotes to front)
     */
    get(hash: string): Promise<CachedEmbedding | null>;
    /**
     * Put embedding in cache (evicts LRU if needed)
     */
    put(hash: string, embedding: CachedEmbedding): Promise<void>;
    /**
     * Save embedding to disk (persistent cache)
     */
    private saveToDisk;
    /**
     * Move node to front (most recently used)
     */
    private moveToFront;
    /**
     * Add node to front
     */
    private addToFront;
    /**
     * Remove node from list
     */
    private removeNode;
    /**
     * Clear all cache
     */
    clear(): void;
    /**
     * Get cache stats
     */
    getStats(): {
        size: number;
        capacity: number;
        hitRate: number;
        memorySize: number;
        diskSize: number;
    };
    /**
     * Preload frequently accessed embeddings from disk
     */
    preload(hashes: string[]): Promise<void>;
}
export declare function getLRUCache(capacity?: number): LRUCache;
/**
 * Enhanced embedding cache with LRU eviction
 * Wraps existing embeddingCache with LRU layer
 */
export declare function getCachedEmbeddingLRU(text: string, model?: string): Promise<CachedEmbedding | null>;
export declare function saveCachedEmbeddingLRU(text: string, vector: number[], model?: string): Promise<void>;
export {};
