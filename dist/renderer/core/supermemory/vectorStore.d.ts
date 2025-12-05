/**
 * Vector Store - Efficient storage and retrieval of vector embeddings
 * Supports similarity search with optional indexing for large datasets
 */
import type { Embedding } from './embedding';
export interface VectorSearchResult {
    embedding: Embedding;
    similarity: number;
    metadata?: Record<string, any>;
}
export interface VectorStoreOptions {
    maxVectors?: number;
    minSimilarity?: number;
    chunkSize?: number;
}
declare class VectorStore {
    private cache;
    private cacheSizeLimit;
    private isInitialized;
    /**
     * Initialize vector store
     */
    init(): Promise<void>;
    /**
     * Save embedding to store
     */
    save(embedding: Embedding): Promise<void>;
    /**
     * Get embedding by ID
     */
    get(id: string): Promise<Embedding | null>;
    /**
     * Delete embedding by ID
     */
    delete(id: string): Promise<boolean>;
    /**
     * Delete all embeddings for an event
     */
    deleteByEventId(eventId: string): Promise<number>;
    /**
     * Search for similar vectors
     * Uses cosine similarity with optional filtering
     */
    search(query: string | number[], options?: VectorStoreOptions): Promise<VectorSearchResult[]>;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Get vector count
     */
    count(): Promise<number>;
    /**
     * Batch save embeddings
     */
    batchSave(embeddings: Embedding[]): Promise<void>;
    /**
     * Clear all embeddings (use with caution)
     */
    clear(): Promise<void>;
    /**
     * Get statistics
     */
    getStats(): Promise<{
        totalVectors: number;
        cachedVectors: number;
        avgVectorDimension: number;
    }>;
}
export declare const vectorStore: VectorStore;
export declare const searchVectors: (query: string | number[], options?: VectorStoreOptions) => Promise<VectorSearchResult[]>;
export declare const saveVector: (embedding: Embedding) => Promise<void>;
export declare const getVector: (id: string) => Promise<Embedding | null>;
export declare const deleteVector: (id: string) => Promise<boolean>;
export declare const getVectorCount: () => Promise<number>;
export declare const getVectorStats: () => Promise<{
    totalVectors: number;
    cachedVectors: number;
    avgVectorDimension: number;
}>;
export {};
