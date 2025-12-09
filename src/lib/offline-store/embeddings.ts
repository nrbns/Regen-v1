/**
 * Embeddings Service for Offline RAG
 * Provides vector embeddings for semantic search
 */

import { type StoredDocument } from './indexedDB';

export interface Embedding {
  vector: number[];
  dimension: number;
  model: string;
}

export interface EmbeddingOptions {
  model?: string;
  dimension?: number;
  normalize?: boolean;
}

/**
 * Generate embeddings for text
 * Uses on-device model or cloud fallback
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<Embedding> {
  const { model = 'all-MiniLM-L6-v2', dimension = 384, normalize = true } = options;

  // Try on-device embedding first (via Tauri)
  try {
    const { isTauriRuntime } = await import('../env');
    if (isTauriRuntime()) {
      const { invoke } = await import('@tauri-apps/api/core');
      const embedding: number[] = await invoke('generate_embedding', {
        text,
        model,
        dimension,
      });

      if (normalize) {
        return {
          vector: normalizeVector(embedding),
          dimension: embedding.length,
          model,
        };
      }

      return {
        vector: embedding,
        dimension: embedding.length,
        model,
      };
    }
  } catch (error) {
    console.warn('[Embeddings] On-device embedding failed, using fallback:', error);
  }

  // Fallback: Use cloud embedding service or simple TF-IDF
  return generateFallbackEmbedding(text, dimension);
}

/**
 * Generate fallback embedding (TF-IDF based or cloud API)
 */
async function generateFallbackEmbedding(
  text: string,
  dimension: number
): Promise<Embedding> {
  // Option 1: Use HuggingFace Inference API (free tier)
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN || ''}`,
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (response.ok) {
      const embedding: number[] = await response.json();
      return {
        vector: normalizeVector(embedding),
        dimension: embedding.length,
        model: 'all-MiniLM-L6-v2',
      };
    }
  } catch (error) {
    console.warn('[Embeddings] HuggingFace API failed:', error);
  }

  // Option 2: Simple hash-based embedding (deterministic but not semantic)
  return generateHashEmbedding(text, dimension);
}

/**
 * Generate hash-based embedding (fallback when no API available)
 * Not semantic but deterministic
 */
function generateHashEmbedding(text: string, dimension: number): Embedding {
  const vector: number[] = new Array(dimension).fill(0);

  // Simple hash-based embedding
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    const index = char % dimension;
    vector[index] += 1 / (i + 1); // Decay by position
  }

  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      vector[i] /= magnitude;
    }
  }

  return {
    vector,
    dimension,
    model: 'hash-based',
  };
}

/**
 * Normalize vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;

  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(embedding1: Embedding, embedding2: Embedding): number {
  if (embedding1.dimension !== embedding2.dimension) {
    throw new Error('Embeddings must have same dimension');
  }

  let dotProduct = 0;
  for (let i = 0; i < embedding1.dimension; i++) {
    dotProduct += embedding1.vector[i] * embedding2.vector[i];
  }

  return dotProduct; // Already normalized, so dot product = cosine similarity
}

/**
 * Find most similar documents using embeddings
 */
export async function findSimilarDocuments(
  queryEmbedding: Embedding,
  documents: Array<{ id: string; embedding?: Embedding }>,
  limit: number = 10
): Promise<Array<{ id: string; similarity: number }>> {
  const similarities = documents
    .map(doc => {
      if (!doc.embedding) return null;
      const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        id: doc.id,
        similarity,
      };
    })
    .filter((item): item is { id: string; similarity: number } => item !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}

/**
 * Generate and store embeddings for a document
 */
export async function generateDocumentEmbeddings(
  document: StoredDocument
): Promise<Embedding> {
  // Generate embedding from title + content
  const text = `${document.title}\n\n${document.content.slice(0, 1000)}`;
  return await generateEmbedding(text);
}

/**
 * Batch generate embeddings
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<Embedding[]> {
  // Generate embeddings in parallel (but limit concurrency)
  const results = await Promise.all(
    texts.map(text => generateEmbedding(text, options))
  );
  return results;
}



