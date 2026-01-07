/**
 * Hugging Face Embedding Integration
 * Uses Hugging Face Inference API for semantic embeddings
 */

// import { MemoryStoreInstance } from './store'; // Unused for now
// import { MemoryEvent } from './tracker'; // Unused for now
// import { Embedding } from './embedding'; // Unused for now

const HUGGINGFACE_API_URL = 'http://localhost:8000/huggingface'; // Backend API URL
const DEFAULT_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384; // all-MiniLM-L6-v2 produces 384-dim embeddings

/**
 * Generate embedding using Hugging Face API
 */
export async function generateHuggingFaceEmbedding(
  text: string,
  model: string = DEFAULT_MODEL
): Promise<number[]> {
  try {
    const response = await fetch(`${HUGGINGFACE_API_URL}/embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${error}`);
    }

    const data = await response.json();
    return data.embedding as number[];
  } catch (error) {
    console.error('[HuggingFace] Failed to generate embedding:', error);
    // Fallback to hash-based embedding if API fails
    return generateFallbackEmbedding(text);
  }
}

/**
 * Generate batch embeddings using Hugging Face API
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  model: string = DEFAULT_MODEL
): Promise<number[][]> {
  try {
    const response = await fetch(`${HUGGINGFACE_API_URL}/embedding/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${error}`);
    }

    const data = await response.json();
    return data.embeddings as number[][];
  } catch (error) {
    console.error('[HuggingFace] Failed to generate batch embeddings:', error);
    // Fallback to hash-based embeddings
    return Promise.all(texts.map(text => generateFallbackEmbedding(text)));
  }
}

/**
 * Fallback hash-based embedding (used when API is unavailable)
 */
function generateFallbackEmbedding(text: string): number[] {
  const vector: number[] = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(j);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const dim = Math.abs(hash) % EMBEDDING_DIMENSIONS;
    vector[dim] += 1 / (i + 1); // Weight by position
  }

  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

/**
 * Check if Hugging Face API is available
 */
export async function checkHuggingFaceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${HUGGINGFACE_API_URL}/status`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.available === true;
  } catch (error) {
    console.debug('[HuggingFace] API check failed:', error);
    return false;
  }
}

