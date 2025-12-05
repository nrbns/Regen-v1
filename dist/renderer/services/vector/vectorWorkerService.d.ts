/**
 * Vector Worker Service - Future Enhancement #3
 * Wrapper for Web Worker that handles vector operations
 * Offloads heavy computations from main thread
 */
export interface VectorSearchResult {
    id: string;
    score: number;
    metadata?: any;
}
declare class VectorWorkerService {
    private worker;
    private pendingRequests;
    private requestId;
    /**
     * Initialize Web Worker
     */
    initialize(): Promise<void>;
    /**
     * Search for similar vectors (offloaded to worker)
     */
    search(queryVector: number[], vectors: Array<{
        id: string;
        vector: number[];
        metadata?: any;
    }>, k?: number): Promise<VectorSearchResult[]>;
    /**
     * Normalize vector (offloaded to worker)
     */
    normalize(vector: number[]): Promise<number[]>;
    /**
     * Batch search multiple queries
     */
    batchSearch(queryVectors: number[][], vectors: Array<{
        id: string;
        vector: number[];
        metadata?: any;
    }>, k?: number): Promise<VectorSearchResult[][]>;
    /**
     * Compute similarity between two vectors
     */
    computeSimilarity(vector1: number[], vector2: number[]): Promise<number>;
    /**
     * Ensure worker is initialized
     */
    private ensureWorker;
    /**
     * Terminate worker
     */
    terminate(): void;
}
export declare function getVectorWorkerService(): VectorWorkerService;
export {};
