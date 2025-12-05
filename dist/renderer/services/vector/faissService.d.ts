/**
 * FAISS Vector Store Service - For embeddings and semantic search
 * PR: Vector store integration
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
declare class FAISSService {
    private embeddings;
    private isInitialized;
    /**
     * Initialize FAISS service
     * In production, this would connect to a local FAISS service or use wasm
     */
    initialize(): Promise<void>;
    /**
     * Add embedding to vector store
     */
    addEmbedding(embedding: Embedding): Promise<void>;
    /**
     * Search for similar embeddings
     */
    search(queryVector: number[], k?: number): Promise<SearchResult[]>;
    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity;
    /**
     * Generate embedding for text (stub - would use sentence-transformers or API)
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * Simple hash function for stub embeddings
     */
    private simpleHash;
    /**
     * Clear all embeddings
     */
    clear(): Promise<void>;
}
export declare const faissService: FAISSService;
export {};
