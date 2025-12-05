/**
 * Embedding Cache - Telepathy Upgrade Phase 3
 * Cache embeddings forever using SHA256 hash
 * Location: ~/regen/embed_cache/{sha256}.json
 *
 * Future Enhancement #2: Now uses LRU cache for memory efficiency
 */
export interface CachedEmbedding {
    text: string;
    vector: number[];
    model: string;
    timestamp: number;
    hash: string;
}
/**
 * Get cached embedding by text hash
 */
export declare function getCachedEmbedding(text: string, model?: string): Promise<number[] | null>;
/**
 * Cache an embedding forever
 */
export declare function cacheEmbedding(text: string, vector: number[], model?: string): Promise<void>;
/**
 * Get embedding with caching (returns cached if available, otherwise generates and caches)
 */
export declare function getOrGenerateEmbedding(text: string, model?: string): Promise<number[]>;
