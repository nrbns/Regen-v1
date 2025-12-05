/**
 * LRU Cache for Embeddings - Future Enhancement #2
 * Advanced caching with Least Recently Used eviction
 * Prevents memory bloat while keeping frequently used embeddings hot
 */
import { invoke } from '@tauri-apps/api/core';
/**
 * LRU Cache implementation for embeddings
 * Evicts least recently used items when capacity is reached
 */
class LRUCache {
    capacity;
    cache;
    head;
    tail;
    diskCache; // hash -> file path
    constructor(capacity = 1000) {
        this.capacity = capacity;
        this.cache = new Map();
        this.diskCache = new Map();
        // Dummy head and tail nodes
        this.head = { key: '', value: {}, prev: null, next: null };
        this.tail = { key: '', value: {}, prev: null, next: null };
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }
    /**
     * Get embedding from cache (promotes to front)
     */
    async get(hash) {
        // Check memory cache first
        const node = this.cache.get(hash);
        if (node) {
            this.moveToFront(node);
            node.value.accessCount++;
            node.value.lastAccessed = Date.now();
            return node.value;
        }
        // Check disk cache
        const diskPath = this.diskCache.get(hash);
        if (diskPath) {
            try {
                const fileData = await invoke('read_file', { path: diskPath });
                const text = new TextDecoder().decode(new Uint8Array(fileData));
                const embedding = JSON.parse(text);
                // Promote to memory cache
                this.put(hash, embedding);
                return embedding;
            }
            catch (error) {
                console.warn('[LRUCache] Failed to load from disk:', hash, error);
                this.diskCache.delete(hash);
            }
        }
        return null;
    }
    /**
     * Put embedding in cache (evicts LRU if needed)
     */
    async put(hash, embedding) {
        // Update if exists
        if (this.cache.has(hash)) {
            const node = this.cache.get(hash);
            node.value = embedding;
            this.moveToFront(node);
            return;
        }
        // Evict if at capacity
        if (this.cache.size >= this.capacity) {
            const lru = this.tail.prev;
            this.removeNode(lru);
            this.cache.delete(lru.key);
            // Save evicted item to disk
            await this.saveToDisk(lru.key, lru.value);
        }
        // Add new node
        const newNode = {
            key: hash,
            value: embedding,
            prev: null,
            next: null,
        };
        this.addToFront(newNode);
        this.cache.set(hash, newNode);
    }
    /**
     * Save embedding to disk (persistent cache)
     */
    async saveToDisk(hash, embedding) {
        try {
            const cachePath = await invoke('get_app_data_path', {
                subpath: `embed_cache/${hash}.json`,
            });
            const json = JSON.stringify(embedding);
            const bytes = new TextEncoder().encode(json);
            await invoke('write_file', {
                path: cachePath,
                contents: Array.from(bytes),
            });
            this.diskCache.set(hash, cachePath);
        }
        catch (error) {
            console.warn('[LRUCache] Failed to save to disk:', hash, error);
        }
    }
    /**
     * Move node to front (most recently used)
     */
    moveToFront(node) {
        this.removeNode(node);
        this.addToFront(node);
    }
    /**
     * Add node to front
     */
    addToFront(node) {
        node.prev = this.head;
        node.next = this.head.next;
        this.head.next.prev = node;
        this.head.next = node;
    }
    /**
     * Remove node from list
     */
    removeNode(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.diskCache.clear();
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }
    /**
     * Get cache stats
     */
    getStats() {
        let totalAccess = 0;
        this.cache.forEach(node => {
            totalAccess += node.value.accessCount;
        });
        return {
            size: this.cache.size,
            capacity: this.capacity,
            hitRate: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
            memorySize: this.cache.size,
            diskSize: this.diskCache.size,
        };
    }
    /**
     * Preload frequently accessed embeddings from disk
     */
    async preload(hashes) {
        for (const hash of hashes) {
            if (!this.cache.has(hash)) {
                const embedding = await this.get(hash);
                if (embedding) {
                    // Already loaded by get()
                }
            }
        }
    }
}
// Singleton instance
let lruCacheInstance = null;
export function getLRUCache(capacity) {
    if (!lruCacheInstance) {
        lruCacheInstance = new LRUCache(capacity);
    }
    return lruCacheInstance;
}
/**
 * Enhanced embedding cache with LRU eviction
 * Wraps existing embeddingCache with LRU layer
 */
export async function getCachedEmbeddingLRU(text, model = 'nomic-embed-text:4bit') {
    const cache = getLRUCache();
    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(`${text}:${model}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return cache.get(hash);
}
export async function saveCachedEmbeddingLRU(text, vector, model = 'nomic-embed-text:4bit') {
    const cache = getLRUCache();
    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(`${text}:${model}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const embedding = {
        text,
        vector,
        model,
        timestamp: Date.now(),
        hash,
        accessCount: 1,
        lastAccessed: Date.now(),
    };
    await cache.put(hash, embedding);
}
