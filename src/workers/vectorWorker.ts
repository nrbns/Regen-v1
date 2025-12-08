/**
 * Vector Operations Web Worker - Future Enhancement #3
 * Moves heavy vector computations off main thread
 * Handles: HNSW search, cosine similarity, embedding normalization
 */

// Web Worker context - runs in separate thread
// @ts-ignore - Web Worker global scope
self.onmessage = async (event: MessageEvent) => {
  const { type, payload, id } = event.data;

  try {
    switch (type) {
      case 'search': {
        const { queryVector, vectors, k = 5 } = payload;
        const results = cosineSimilaritySearch(queryVector, vectors, k);
        self.postMessage({ type: 'search_result', id, results });
        break;
      }

      case 'normalize': {
        const { vector } = payload;
        const normalized = normalizeVector(vector);
        self.postMessage({ type: 'normalize_result', id, vector: normalized });
        break;
      }

      case 'batch_search': {
        const { queryVectors, vectors, k = 5 } = payload;
        const results = queryVectors.map((qv: number[]) => cosineSimilaritySearch(qv, vectors, k));
        self.postMessage({ type: 'batch_search_result', id, results });
        break;
      }

      case 'compute_similarity': {
        const { vector1, vector2 } = payload;
        const similarity = cosineSimilarity(vector1, vector2);
        self.postMessage({ type: 'similarity_result', id, similarity });
        break;
      }

      default:
        self.postMessage({ type: 'error', id, error: `Unknown operation: ${type}` });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Cosine similarity search (fast, in-memory)
 */
function cosineSimilaritySearch(
  queryVector: number[],
  vectors: Array<{ id: string; vector: number[]; metadata?: any }>,
  k: number
): Array<{ id: string; score: number; metadata?: any }> {
  const results = vectors
    .map(v => ({
      id: v.id,
      score: cosineSimilarity(queryVector, v.vector),
      metadata: v.metadata,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return results;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

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
 * Normalize vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map(v => v / norm);
}






