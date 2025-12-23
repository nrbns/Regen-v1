/**
 * Vector Store - Efficient storage and retrieval of vector embeddings
 * Supports similarity search with optional indexing for large datasets
 */

import type { Embedding } from './embedding';
import { generateEmbedding } from './embedding';
// import { searchEmbeddings as searchEmbeddingsBase } from './embedding'; // Unused for now
import { superMemoryDB } from './db';

export interface VectorSearchResult {
  embedding: Embedding;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface VectorStoreOptions {
  maxVectors?: number; // Maximum vectors to load for search
  minSimilarity?: number; // Minimum similarity threshold (0-1)
  chunkSize?: number; // Batch size for operations
}

class VectorStore {
  private cache: Map<string, Embedding> = new Map();
  private cacheSizeLimit = 1000; // Keep top 1000 most recent in memory
  private isInitialized = false;
  private insertCount = 0; // LAG FIX: Track inserts for pruning
  private readonly PRUNE_INTERVAL = 100; // Prune every 100 inserts to prevent OOM

  /**
   * Initialize vector store
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Pre-load recent embeddings into cache
      const recentEmbeddings = await superMemoryDB.getAllEmbeddings(100);
      for (const embedding of recentEmbeddings) {
        this.cache.set(embedding.id, embedding as Embedding);
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('[VectorStore] Initialization failed:', error);
    }
  }

  /**
   * Save embedding to store
   */
  async save(embedding: Embedding): Promise<void> {
    // LAG FIX: Increment insert counter and prune if needed
    this.insertCount++;
    if (this.insertCount % this.PRUNE_INTERVAL === 0) {
      await this.pruneOldEmbeddings();
    }

    // Update cache
    this.cache.set(embedding.id, embedding);

    // Enforce cache size limit
    if (this.cache.size > this.cacheSizeLimit) {
      // Remove oldest entries (FIFO)
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, this.cache.size - this.cacheSizeLimit);
      for (const [id] of toRemove) {
        this.cache.delete(id);
      }
    }

    // Persist to IndexedDB
    try {
      await superMemoryDB.saveEmbedding({
        id: embedding.id,
        eventId: embedding.eventId,
        vector: embedding.vector,
        text: embedding.text,
        metadata: embedding.metadata,
        timestamp: embedding.timestamp,
      });
    } catch (error) {
      console.error('[VectorStore] Failed to save embedding:', error);
    }
  }

  /**
   * Get embedding by ID
   */
  async get(id: string): Promise<Embedding | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Load from IndexedDB
    try {
      const dbEmbedding = await superMemoryDB.getEmbedding(id);
      if (dbEmbedding) {
        const embedding: Embedding = {
          id: dbEmbedding.id,
          eventId: dbEmbedding.eventId,
          vector: dbEmbedding.vector,
          text: dbEmbedding.text,
          metadata: dbEmbedding.metadata,
          timestamp: dbEmbedding.timestamp,
        };

        // Cache it
        this.cache.set(id, embedding);
        return embedding;
      }
    } catch (error) {
      console.error('[VectorStore] Failed to get embedding:', error);
    }

    return null;
  }

  /**
   * Delete embedding by ID
   */
  async delete(id: string): Promise<boolean> {
    // Remove from cache
    this.cache.delete(id);

    // Delete from IndexedDB
    try {
      await superMemoryDB.deleteEmbedding(id);
      return true;
    } catch (error) {
      console.error('[VectorStore] Failed to delete embedding:', error);
      return false;
    }
  }

  /**
   * LAG FIX: Prune old embeddings to prevent OOM at scale (400+ tabs)
   * Keeps most recent 5000 embeddings, deletes older ones
   */
  private async pruneOldEmbeddings(): Promise<void> {
    try {
      const MAX_EMBEDDINGS = 5000;
      const count = await superMemoryDB.getEmbeddingCount();

      if (count > MAX_EMBEDDINGS) {
        const toDelete = count - MAX_EMBEDDINGS;
        console.log(`[VectorStore] Pruning ${toDelete} old embeddings (count: ${count})`);

        // Get oldest embeddings by timestamp
        const allEmbeddings = await superMemoryDB.getAllEmbeddings();
        allEmbeddings.sort((a, b) => a.timestamp - b.timestamp);
        const oldestIds = allEmbeddings.slice(0, toDelete).map(e => e.id);

        // Delete in batches
        for (let i = 0; i < oldestIds.length; i += 50) {
          const batch = oldestIds.slice(i, i + 50);
          await Promise.all(batch.map(id => superMemoryDB.deleteEmbedding(id)));
        }

        console.log(`[VectorStore] Pruned ${toDelete} embeddings, remaining: ${MAX_EMBEDDINGS}`);
      }
    } catch (error) {
      console.warn('[VectorStore] Pruning failed:', error);
    }
  }

  /**
   * Delete all embeddings for an event
   */
  async deleteByEventId(eventId: string): Promise<number> {
    let deleted = 0;

    // Find and delete from cache
    const toDelete: string[] = [];
    for (const [id, embedding] of this.cache.entries()) {
      if (embedding.eventId === eventId) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.cache.delete(id);
      deleted++;
    }

    // Delete from IndexedDB
    try {
      await superMemoryDB.deleteEmbeddingsByEventId(eventId);
      deleted++;
    } catch (error) {
      console.error('[VectorStore] Failed to delete embeddings by event ID:', error);
    }

    return deleted;
  }

  /**
   * Search for similar vectors
   * Uses cosine similarity with optional filtering
   */
  async search(
    query: string | number[],
    options: VectorStoreOptions = {}
  ): Promise<VectorSearchResult[]> {
    const { maxVectors = 1000, minSimilarity = 0.0 } = options;

    // Generate query embedding if string provided
    let queryVector: number[];
    if (typeof query === 'string') {
      queryVector = await generateEmbedding(query);
    } else {
      queryVector = query;
    }

    // Load embeddings (with limit for performance)
    const allEmbeddings: Embedding[] = [];

    // Load from cache first
    for (const embedding of this.cache.values()) {
      allEmbeddings.push(embedding);
    }

    // Load additional from IndexedDB if needed
    if (allEmbeddings.length < maxVectors) {
      try {
        const dbEmbeddings = await superMemoryDB.getAllEmbeddings(maxVectors);
        for (const dbEmbedding of dbEmbeddings) {
          const embedding: Embedding = {
            id: dbEmbedding.id,
            eventId: dbEmbedding.eventId,
            vector: dbEmbedding.vector,
            text: dbEmbedding.text,
            metadata: dbEmbedding.metadata,
            timestamp: dbEmbedding.timestamp,
          };

          // Avoid duplicates
          if (!this.cache.has(embedding.id)) {
            this.cache.set(embedding.id, embedding);
            allEmbeddings.push(embedding);
          }

          if (allEmbeddings.length >= maxVectors) {
            break;
          }
        }
      } catch (error) {
        console.warn('[VectorStore] Failed to load embeddings from IndexedDB:', error);
      }
    }

    // Calculate similarities
    const results: VectorSearchResult[] = allEmbeddings.map(embedding => {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);
      return {
        embedding,
        similarity,
        metadata: embedding.metadata,
      };
    });

    // Filter by minimum similarity and sort
    const filtered = results
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity);

    return filtered;
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

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get vector count
   */
  async count(): Promise<number> {
    try {
      // Get count from IndexedDB
      const count = await superMemoryDB.getEmbeddingCount();
      return count || this.cache.size;
    } catch {
      // Fallback to cache size
      return this.cache.size;
    }
  }

  /**
   * Batch save embeddings
   */
  async batchSave(embeddings: Embedding[]): Promise<void> {
    const batch = embeddings.slice(0, 100); // Process in batches

    for (const embedding of batch) {
      await this.save(embedding);
    }

    if (embeddings.length > 100) {
      // Process remaining in next batch
      await this.batchSave(embeddings.slice(100));
    }
  }

  /**
   * Clear all embeddings (use with caution)
   */
  async clear(): Promise<void> {
    this.cache.clear();

    try {
      await superMemoryDB.clearEmbeddings();
    } catch (error) {
      console.error('[VectorStore] Failed to clear embeddings:', error);
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    cachedVectors: number;
    avgVectorDimension: number;
  }> {
    const total = await this.count();
    const cached = this.cache.size;

    // Calculate average dimension from cache
    let totalDimensions = 0;
    let count = 0;
    for (const embedding of this.cache.values()) {
      totalDimensions += embedding.vector.length;
      count++;
    }

    const avgDimension = count > 0 ? totalDimensions / count : 0;

    return {
      totalVectors: total,
      cachedVectors: cached,
      avgVectorDimension: avgDimension,
    };
  }
}

// Singleton instance
export const vectorStore = new VectorStore();

// Initialize on module load
vectorStore.init().catch(console.warn);

// Export convenience functions
export const searchVectors = (query: string | number[], options?: VectorStoreOptions) =>
  vectorStore.search(query, options);
export const saveVector = (embedding: Embedding) => vectorStore.save(embedding);
export const getVector = (id: string) => vectorStore.get(id);
export const deleteVector = (id: string) => vectorStore.delete(id);
export const getVectorCount = () => vectorStore.count();
export const getVectorStats = () => vectorStore.getStats();
