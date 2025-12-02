/**
 * Vector Worker Service - Future Enhancement #3
 * Wrapper for Web Worker that handles vector operations
 * Offloads heavy computations from main thread
 */

// Vector worker service - offloads heavy computations

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: any;
}

class VectorWorkerService {
  private worker: Worker | null = null;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private requestId = 0;

  /**
   * Initialize Web Worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return; // Already initialized
    }

    // Create worker from inline code (Vite handles this)
    // Note: Vite will bundle the worker automatically
    try {
      this.worker = new Worker(new URL('../../workers/vectorWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (error) {
      // Fallback: create inline worker if URL import fails
      console.warn('[VectorWorker] Failed to create worker from URL, using inline fallback', error);
      const workerCode = `
        // Inline worker code (fallback)
        self.onmessage = async (event) => {
          const { type, payload, id } = event.data;
          try {
            if (type === 'search') {
              const { queryVector, vectors, k = 5 } = payload;
              const results = vectors.map(v => ({
                id: v.id,
                score: cosineSimilarity(queryVector, v.vector),
                metadata: v.metadata,
              })).sort((a, b) => b.score - a.score).slice(0, k);
              self.postMessage({ type: 'search_result', id, results });
            }
          } catch (error) {
            self.postMessage({ type: 'error', id, error: error.message });
          }
        };
        function cosineSimilarity(a, b) {
          if (a.length !== b.length) return 0;
          let dot = 0, normA = 0, normB = 0;
          for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
          }
          return dot / (Math.sqrt(normA) * Math.sqrt(normB));
        }
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    }

    this.worker.onmessage = (event: MessageEvent) => {
      const { type, id, results, vector, similarity, error } = event.data;

      const request = this.pendingRequests.get(id);
      if (!request) {
        console.warn('[VectorWorker] No pending request for id:', id);
        return;
      }

      this.pendingRequests.delete(id);

      if (error) {
        request.reject(new Error(error));
        return;
      }

      switch (type) {
        case 'search_result':
          request.resolve(results);
          break;
        case 'normalize_result':
          request.resolve(vector);
          break;
        case 'batch_search_result':
          request.resolve(results);
          break;
        case 'similarity_result':
          request.resolve(similarity);
          break;
        default:
          request.reject(new Error(`Unknown response type: ${type}`));
      }
    };

    this.worker.onerror = (error: ErrorEvent) => {
      console.error('[VectorWorker] Worker error:', error);
      // Reject all pending requests
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error('Worker error'));
      });
      this.pendingRequests.clear();
    };

    console.log('[VectorWorker] Initialized');
  }

  /**
   * Search for similar vectors (offloaded to worker)
   */
  async search(
    queryVector: number[],
    vectors: Array<{ id: string; vector: number[]; metadata?: any }>,
    k: number = 5
  ): Promise<VectorSearchResult[]> {
    await this.ensureWorker();

    const id = `search_${this.requestId++}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.worker!.postMessage({
        type: 'search',
        id,
        payload: { queryVector, vectors, k },
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Vector search timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Normalize vector (offloaded to worker)
   */
  async normalize(vector: number[]): Promise<number[]> {
    await this.ensureWorker();

    const id = `normalize_${this.requestId++}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.worker!.postMessage({
        type: 'normalize',
        id,
        payload: { vector },
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Normalize timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(
    queryVectors: number[][],
    vectors: Array<{ id: string; vector: number[]; metadata?: any }>,
    k: number = 5
  ): Promise<VectorSearchResult[][]> {
    await this.ensureWorker();

    const id = `batch_${this.requestId++}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.worker!.postMessage({
        type: 'batch_search',
        id,
        payload: { queryVectors, vectors, k },
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Batch search timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Compute similarity between two vectors
   */
  async computeSimilarity(vector1: number[], vector2: number[]): Promise<number> {
    await this.ensureWorker();

    const id = `similarity_${this.requestId++}`;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.worker!.postMessage({
        type: 'compute_similarity',
        id,
        payload: { vector1, vector2 },
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Similarity computation timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Ensure worker is initialized
   */
  private async ensureWorker(): Promise<void> {
    if (!this.worker) {
      await this.initialize();
    }
  }

  /**
   * Terminate worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingRequests.clear();
      console.log('[VectorWorker] Terminated');
    }
  }
}

// Singleton instance
let vectorWorkerInstance: VectorWorkerService | null = null;

export function getVectorWorkerService(): VectorWorkerService {
  if (!vectorWorkerInstance) {
    vectorWorkerInstance = new VectorWorkerService();
  }
  return vectorWorkerInstance;
}
