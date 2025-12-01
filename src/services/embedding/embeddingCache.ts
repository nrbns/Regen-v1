/**
 * Embedding Cache - Telepathy Upgrade Phase 3
 * Cache embeddings forever using SHA256 hash
 * Location: ~/regen/embed_cache/{sha256}.json
 */

import { invoke } from '@tauri-apps/api/core';

export interface CachedEmbedding {
  text: string;
  vector: number[];
  model: string;
  timestamp: number;
  hash: string;
}

/**
 * Generate SHA256 hash of text (for cache key)
 */
async function sha256(text: string): Promise<string> {
  // Use Web Crypto API for SHA256
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Get cache path for an embedding hash
 */
async function getCachePath(hash: string): Promise<string> {
  try {
    return await invoke<string>('get_app_data_path', {
      subpath: `embed_cache/${hash}.json`,
    });
  } catch (error) {
    // Fallback path if Tauri command fails
    console.warn('[EmbeddingCache] Failed to get app data path', error);
    return `embed_cache/${hash}.json`;
  }
}

/**
 * Get cached embedding by text hash
 */
export async function getCachedEmbedding(
  text: string,
  model: string = 'nomic-embed-text:4bit'
): Promise<number[] | null> {
  try {
    const hash = await sha256(`${model}:${text}`);
    const cachePath = await getCachePath(hash);

    // Try to read cached file
    try {
      // Read file as binary (bytes) and decode to string
      const fileBytes = await invoke<number[]>('read_file', { path: cachePath });
      const fileContent = new TextDecoder().decode(new Uint8Array(fileBytes));
      const cached: CachedEmbedding = JSON.parse(fileContent);

      // Verify it's for the same model and text
      if (cached.model === model && cached.text === text) {
        console.log('[EmbeddingCache] Cache hit for', hash.slice(0, 8));
        return cached.vector;
      }
    } catch (error) {
      // Cache miss - file doesn't exist
      console.debug('[EmbeddingCache] Cache miss for', hash.slice(0, 8));
    }

    return null;
  } catch (error) {
    console.warn('[EmbeddingCache] Failed to get cached embedding', error);
    return null;
  }
}

/**
 * Cache an embedding forever
 */
export async function cacheEmbedding(
  text: string,
  vector: number[],
  model: string = 'nomic-embed-text:4bit'
): Promise<void> {
  try {
    const hash = await sha256(`${model}:${text}`);
    const cachePath = await getCachePath(hash);

    const cached: CachedEmbedding = {
      text,
      vector,
      model,
      timestamp: Date.now(),
      hash,
    };

    // Write to cache file
    const jsonContent = JSON.stringify(cached);
    const bytes = new TextEncoder().encode(jsonContent);

    await invoke('write_file', {
      path: cachePath,
      contents: Array.from(bytes),
    });

    console.log('[EmbeddingCache] Cached embedding', hash.slice(0, 8));
  } catch (error) {
    console.warn('[EmbeddingCache] Failed to cache embedding', error);
    // Non-critical - continue even if caching fails
  }
}

/**
 * Get embedding with caching (returns cached if available, otherwise generates and caches)
 */
export async function getOrGenerateEmbedding(
  text: string,
  model: string = 'nomic-embed-text:4bit'
): Promise<number[]> {
  // Try cache first
  const cached = await getCachedEmbedding(text, model);
  if (cached) {
    return cached;
  }

  // Generate new embedding
  const vector = await invoke<number[]>('embed_text', {
    text,
    model,
  });

  // Cache for future use (async - don't wait)
  cacheEmbedding(text, vector, model).catch(() => {
    // Non-critical
  });

  return vector;
}
