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

class FAISSService {
  private embeddings: Map<string, Embedding> = new Map();
  private isInitialized = false;

  /**
   * Initialize FAISS service
   * In production, this would connect to a local FAISS service or use wasm
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // For now, use in-memory storage
    // TODO: Integrate with actual FAISS service (Python microservice or wasm)
    this.isInitialized = true;
    console.log('[FAISSService] Initialized (in-memory mode)');
  }

  /**
   * Add embedding to vector store
   */
  async addEmbedding(embedding: Embedding): Promise<void> {
    await this.initialize();
    this.embeddings.set(embedding.id, embedding);
  }

  /**
   * Search for similar embeddings
   */
  async search(queryVector: number[], k: number = 5): Promise<SearchResult[]> {
    await this.initialize();

    if (this.embeddings.size === 0) {
      return [];
    }

    // Simple cosine similarity search (in-memory)
    // In production, use FAISS for efficient similarity search
    const results: Array<{ embedding: Embedding; score: number }> = [];

    for (const embedding of this.embeddings.values()) {
      const score = this.cosineSimilarity(queryVector, embedding.vector);
      results.push({ embedding, score });
    }

    // Sort by score and return top k
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, k).map(r => ({
      id: r.embedding.id,
      text: r.embedding.text,
      score: r.score,
      metadata: r.embedding.metadata,
    }));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
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
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Generate embedding for text (stub - would use sentence-transformers or API)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Use sentence-transformers or OpenAI embeddings API
    // For now, return a simple hash-based vector
    const hash = this.simpleHash(text);
    const vector = new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
    return vector;
  }

  /**
   * Simple hash function for stub embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear all embeddings
   */
  async clear(): Promise<void> {
    this.embeddings.clear();
  }
}

export const faissService = new FAISSService();
