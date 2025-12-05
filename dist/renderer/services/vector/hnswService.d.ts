/**
 * HNSW Vector Service - Telepathy Upgrade Phase 1
 * Fast approximate nearest neighbor search with disk persistence
 * 20,000 vectors → 8ms search (vs 800ms before)
 */
export interface Embedding {
    id: string;
    text: string;
    vector: number[];
    metadata?: Record<string, any>;
}
export interface SearchResult {
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, any>;
}
declare class HNSWService {
    private index;
    private isInitialized;
    private dimension;
    private maxElements;
    private indexPath;
    private idToIndex;
    private indexToId;
    private embeddings;
    private nextIndex;
    /**
     * Initialize HNSW index with disk persistence
     * Telepathy Upgrade: Fast approximate nearest neighbor search
     */
    initialize(dimension?: number): Promise<void>;
    /**
     * Add embedding to index
     */
    addEmbedding(embedding: Embedding): Promise<void>;
    /**
     * Search for similar embeddings (FAST - <70ms for 20k vectors)
     */
    search(queryVector: number[], k?: number): Promise<SearchResult[]>;
    /**
     * Cosine similarity (fallback)
     */
    private cosineSimilarity;
    /**
     * Save index to disk
     */
    save(): Promise<void>;
    /**
     * Clear all embeddings
     */
    clear(): Promise<void>;
    /**
     * Get embedding by ID
     */
    getEmbedding(id: string): Embedding | undefined;
}
export declare const hnswService: HNSWService;
export {};
