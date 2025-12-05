/**
 * Vector Operations Web Worker - Future Enhancement #3
 * Moves heavy vector computations off main thread
 * Handles: HNSW search, cosine similarity, embedding normalization
 */
/**
 * Cosine similarity search (fast, in-memory)
 */
declare function cosineSimilaritySearch(queryVector: number[], vectors: Array<{
    id: string;
    vector: number[];
    metadata?: any;
}>, k: number): Array<{
    id: string;
    score: number;
    metadata?: any;
}>;
/**
 * Cosine similarity between two vectors
 */
declare function cosineSimilarity(a: number[], b: number[]): number;
/**
 * Normalize vector to unit length
 */
declare function normalizeVector(vector: number[]): number[];
