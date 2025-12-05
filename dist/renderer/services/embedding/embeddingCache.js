/**
 * Embedding Cache - Telepathy Upgrade Phase 3
 * Cache embeddings forever using SHA256 hash
 * Location: ~/regen/embed_cache/{sha256}.json
 *
 * Future Enhancement #2: Now uses LRU cache for memory efficiency
 */
import { invoke } from '@tauri-apps/api/core';
import { saveCachedEmbeddingLRU, getCachedEmbeddingLRU } from './lruCache';
import { isTauriRuntime, isWebMode } from '../../lib/env';
/**
 * Generate SHA256 hash of text (for cache key)
 */
async function sha256(text) {
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
async function getCachePath(hash) {
    try {
        // Check if Tauri is available
        const { isTauriRuntime } = await import('../../lib/env');
        if (!isTauriRuntime()) {
            return `embed_cache/${hash}.json`; // Fallback for web mode
        }
        return await invoke('get_app_data_path', {
            subpath: `embed_cache/${hash}.json`,
        });
    }
    catch (error) {
        // Silently fallback - Tauri not available is expected in web mode
        if (error?.message?.includes('Tauri API not available')) {
            return `embed_cache/${hash}.json`;
        }
        // Only log unexpected errors
        if (error?.message && !error.message.includes('Tauri')) {
            console.warn('[EmbeddingCache] Failed to get app data path', error);
        }
        return `embed_cache/${hash}.json`;
    }
}
/**
 * Get cached embedding by text hash
 */
export async function getCachedEmbedding(text, model = 'nomic-embed-text:4bit') {
    try {
        // Future Enhancement #2: Try LRU cache first (fast, in-memory)
        const lruResult = await getCachedEmbeddingLRU(text, model);
        if (lruResult) {
            console.log('[EmbeddingCache] LRU cache hit');
            return lruResult.vector;
        }
        // Fallback to disk cache (slower but persistent)
        const hash = await sha256(`${model}:${text}`);
        const cachePath = await getCachePath(hash);
        // Try to read cached file
        try {
            // Read file as binary (bytes) and decode to string
            const fileBytes = await invoke('read_file', { path: cachePath });
            const fileContent = new TextDecoder().decode(new Uint8Array(fileBytes));
            const cached = JSON.parse(fileContent);
            // Verify it's for the same model and text
            if (cached.model === model && cached.text === text) {
                console.log('[EmbeddingCache] Disk cache hit for', hash.slice(0, 8));
                // Promote to LRU cache
                await saveCachedEmbeddingLRU(text, cached.vector, model);
                return cached.vector;
            }
        }
        catch {
            // Cache miss - file doesn't exist
            console.debug('[EmbeddingCache] Cache miss for', hash.slice(0, 8));
        }
        return null;
    }
    catch (error) {
        console.warn('[EmbeddingCache] Failed to get cached embedding', error);
        return null;
    }
}
/**
 * Cache an embedding forever
 */
export async function cacheEmbedding(text, vector, model = 'nomic-embed-text:4bit') {
    try {
        // Future Enhancement #2: Save to LRU cache (fast, in-memory)
        await saveCachedEmbeddingLRU(text, vector, model);
        // Also save to disk for persistence
        const hash = await sha256(`${model}:${text}`);
        const cachePath = await getCachePath(hash);
        const cached = {
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
    }
    catch (error) {
        console.warn('[EmbeddingCache] Failed to cache embedding', error);
        // Non-critical - continue even if caching fails
    }
}
/**
 * Get embedding with caching (returns cached if available, otherwise generates and caches)
 */
export async function getOrGenerateEmbedding(text, model = 'nomic-embed-text:4bit') {
    // Try cache first
    const cached = await getCachedEmbedding(text, model);
    if (cached) {
        return cached;
    }
    // Generate new embedding
    // Skip Tauri API in web mode
    if (isWebMode() || !isTauriRuntime()) {
        // Fallback to simple hash-based vector for web mode
        const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
    }
    try {
        const vector = await invoke('embed_text', {
            text,
            model,
        });
        // Cache for future use (async - don't wait)
        cacheEmbedding(text, vector, model).catch(() => {
            // Non-critical
        });
        return vector;
    }
    catch (error) {
        // Suppress Tauri API errors in web mode
        if (!isWebMode()) {
            console.warn('[EmbeddingCache] Tauri embedding failed, using fallback', error);
        }
        // Fallback to simple hash-based vector
        const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
    }
}
