/**
 * HNSW Vector Search
 * Phase 2, Day 5: HNSW Embeddings - Faster research, vector search optimization
 *
 * Note: This is a lightweight implementation. For production, consider using
 * a proper HNSW library like hnswlib-node or integrating with Qdrant/Weaviate.
 */

export interface Vector {
  id: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

/**
 * Phase 2, Day 5: Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Phase 2, Day 5: L2 distance (Euclidean) between two vectors
 */
function l2Distance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Phase 2, Day 5: Simple HNSW-like graph structure
 * This is a simplified version. For production, use a proper HNSW library.
 */
class SimpleHNSWIndex {
  private vectors: Vector[] = [];
  private dimension: number = 0;
  private maxConnections: number = 16; // M parameter
  private efConstruction: number = 200; // ef_construction parameter
  private efSearch: number = 50; // ef_search parameter

  /**
   * Phase 2, Day 5: Add vector to index
   */
  addVector(vector: Vector): void {
    if (this.vectors.length === 0) {
      this.dimension = vector.embedding.length;
    } else if (vector.embedding.length !== this.dimension) {
      throw new Error(
        `Vector dimension mismatch: expected ${this.dimension}, got ${vector.embedding.length}`
      );
    }

    this.vectors.push(vector);
  }

  /**
   * Phase 2, Day 5: Search for k nearest neighbors
   */
  search(queryVector: number[], k: number = 10): VectorSearchResult[] {
    if (this.vectors.length === 0) {
      return [];
    }

    if (queryVector.length !== this.dimension) {
      throw new Error(
        `Query vector dimension mismatch: expected ${this.dimension}, got ${queryVector.length}`
      );
    }

    // For small datasets, use brute force (faster than building graph)
    if (this.vectors.length < 100) {
      return this.bruteForceSearch(queryVector, k);
    }

    // For larger datasets, use approximate search
    return this.approximateSearch(queryVector, k);
  }

  /**
   * Phase 2, Day 5: Brute force search (exact, but slow for large datasets)
   */
  private bruteForceSearch(queryVector: number[], k: number): VectorSearchResult[] {
    const results: Array<{ vector: Vector; score: number }> = [];

    for (const vector of this.vectors) {
      const score = cosineSimilarity(queryVector, vector.embedding);
      results.push({ vector, score });
    }

    // Sort by score (descending) and take top k
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k).map(r => ({
      id: r.vector.id,
      score: r.score,
      metadata: r.vector.metadata,
    }));
  }

  /**
   * Phase 2, Day 5: Approximate search using sampling
   */
  private approximateSearch(queryVector: number[], k: number): VectorSearchResult[] {
    // Sample a subset of vectors for faster search
    const sampleSize = Math.min(this.efSearch, this.vectors.length);
    const sampledVectors: Vector[] = [];

    // Random sampling (in production, use proper HNSW graph traversal)
    const indices = new Set<number>();
    while (indices.size < sampleSize) {
      indices.add(Math.floor(Math.random() * this.vectors.length));
    }

    for (const idx of indices) {
      sampledVectors.push(this.vectors[idx]);
    }

    // Search in sampled vectors
    const results: Array<{ vector: Vector; score: number }> = [];
    for (const vector of sampledVectors) {
      const score = cosineSimilarity(queryVector, vector.embedding);
      results.push({ vector, score });
    }

    // Sort and return top k
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k).map(r => ({
      id: r.vector.id,
      score: r.score,
      metadata: r.vector.metadata,
    }));
  }

  /**
   * Phase 2, Day 5: Get index stats
   */
  getStats(): { vectorCount: number; dimension: number } {
    return {
      vectorCount: this.vectors.length,
      dimension: this.dimension,
    };
  }

  /**
   * Phase 2, Day 5: Clear index
   */
  clear(): void {
    this.vectors = [];
    this.dimension = 0;
  }
}

/**
 * Phase 2, Day 5: HNSW Vector Search Service
 */
class HNSWVectorSearchService {
  private indices: Map<string, SimpleHNSWIndex> = new Map();

  /**
   * Phase 2, Day 5: Get or create index for a namespace
   */
  private getIndex(namespace: string): SimpleHNSWIndex {
    if (!this.indices.has(namespace)) {
      this.indices.set(namespace, new SimpleHNSWIndex());
    }
    return this.indices.get(namespace)!;
  }

  /**
   * Phase 2, Day 5: Add vectors to index
   */
  addVectors(namespace: string, vectors: Vector[]): void {
    const index = this.getIndex(namespace);
    for (const vector of vectors) {
      index.addVector(vector);
    }
  }

  /**
   * Phase 2, Day 5: Search for similar vectors
   */
  search(
    namespace: string,
    queryVector: number[],
    k: number = 10,
    minScore: number = 0.0
  ): VectorSearchResult[] {
    const index = this.getIndex(namespace);
    const results = index.search(queryVector, k);
    return results.filter(r => r.score >= minScore);
  }

  /**
   * Phase 2, Day 5: Get index stats
   */
  getStats(namespace: string): { vectorCount: number; dimension: number } | null {
    const index = this.indices.get(namespace);
    return index ? index.getStats() : null;
  }

  /**
   * Phase 2, Day 5: Clear index
   */
  clear(namespace: string): void {
    this.indices.delete(namespace);
  }

  /**
   * Phase 2, Day 5: Clear all indices
   */
  clearAll(): void {
    this.indices.clear();
  }
}

// Singleton instance
export const hnswVectorSearch = new HNSWVectorSearchService();

// Export utility functions
export { cosineSimilarity, l2Distance };
