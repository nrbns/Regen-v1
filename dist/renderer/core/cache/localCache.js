/**
 * Local Cache & Queue System
 * Enables offline agent support and deterministic operations
 */
class LocalCache {
    cache = new Map();
    queue = [];
    maxCacheSize;
    maxQueueSize;
    db = null;
    constructor(maxCacheSize = 1000, maxQueueSize = 100) {
        this.maxCacheSize = maxCacheSize;
        this.maxQueueSize = maxQueueSize;
        this.initDB();
    }
    /**
     * Initialize IndexedDB for persistent cache
     */
    async initDB() {
        return new Promise((resolve, _reject) => {
            const request = indexedDB.open('regen-cache', 1);
            request.onerror = () => {
                console.warn('[LocalCache] IndexedDB not available, using memory cache');
                resolve();
                // reject intentionally unused - we fallback to memory cache
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.loadFromDB();
                resolve();
            };
            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('queue')) {
                    const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
                    queueStore.createIndex('priority', 'priority', { unique: false });
                    queueStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }
    /**
     * Load cache from IndexedDB
     */
    async loadFromDB() {
        if (!this.db)
            return;
        try {
            const cacheTx = this.db.transaction('cache', 'readonly');
            const cacheStore = cacheTx.objectStore('cache');
            const cacheRequest = cacheStore.getAll();
            cacheRequest.onsuccess = () => {
                const entries = cacheRequest.result;
                for (const entry of entries) {
                    // Check expiration
                    if (entry.expiresAt && entry.expiresAt < Date.now()) {
                        continue;
                    }
                    this.cache.set(entry.key, entry);
                }
            };
            const queueTx = this.db.transaction('queue', 'readonly');
            const queueStore = queueTx.objectStore('queue');
            const queueRequest = queueStore.getAll();
            queueRequest.onsuccess = () => {
                const items = queueRequest.result;
                this.queue = items.sort((a, b) => b.priority - a.priority);
            };
        }
        catch (error) {
            console.error('[LocalCache] Failed to load from DB:', error);
        }
    }
    /**
     * Get value from cache
     */
    async get(key) {
        // Check memory cache first
        const entry = this.cache.get(key);
        if (entry) {
            // Check expiration
            if (entry.expiresAt && entry.expiresAt < Date.now()) {
                this.cache.delete(key);
                await this.deleteFromDB(key);
                return null;
            }
            return entry.value;
        }
        // Check IndexedDB
        if (this.db) {
            try {
                const tx = this.db.transaction('cache', 'readonly');
                const store = tx.objectStore('cache');
                const request = store.get(key);
                return new Promise(resolve => {
                    request.onsuccess = () => {
                        const entry = request.result;
                        if (entry) {
                            // Check expiration
                            if (entry.expiresAt && entry.expiresAt < Date.now()) {
                                this.deleteFromDB(key);
                                resolve(null);
                                return;
                            }
                            // Add to memory cache
                            this.cache.set(key, entry);
                            resolve(entry.value);
                        }
                        else {
                            resolve(null);
                        }
                    };
                    request.onerror = () => resolve(null);
                });
            }
            catch (error) {
                console.error('[LocalCache] Failed to get from DB:', error);
                return null;
            }
        }
        return null;
    }
    /**
     * Set value in cache
     */
    async set(key, value, options) {
        const entry = {
            key,
            value,
            timestamp: Date.now(),
            expiresAt: options?.ttl ? Date.now() + options.ttl * 1000 : undefined,
            tags: options?.tags,
        };
        // Add to memory cache
        this.cache.set(key, entry);
        // Enforce max size
        if (this.cache.size > this.maxCacheSize) {
            // Remove oldest entry
            const oldestKey = Array.from(this.cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            this.cache.delete(oldestKey);
            await this.deleteFromDB(oldestKey);
        }
        // Save to IndexedDB
        if (this.db) {
            try {
                const tx = this.db.transaction('cache', 'readwrite');
                const store = tx.objectStore('cache');
                store.put(entry);
            }
            catch (error) {
                console.error('[LocalCache] Failed to save to DB:', error);
            }
        }
    }
    /**
     * Delete from cache
     */
    async delete(key) {
        this.cache.delete(key);
        await this.deleteFromDB(key);
    }
    /**
     * Delete from IndexedDB
     */
    async deleteFromDB(key) {
        if (!this.db)
            return;
        try {
            const tx = this.db.transaction('cache', 'readwrite');
            const store = tx.objectStore('cache');
            store.delete(key);
        }
        catch (error) {
            console.error('[LocalCache] Failed to delete from DB:', error);
        }
    }
    /**
     * Clear cache by tags
     */
    async clearByTags(tags) {
        const keysToDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            await this.delete(key);
        }
    }
    /**
     * Add item to queue
     */
    async enqueue(type, data, options) {
        const item = {
            id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            type,
            data,
            priority: options?.priority ?? 0,
            createdAt: Date.now(),
            attempts: 0,
            maxAttempts: options?.maxAttempts ?? 3,
        };
        this.queue.push(item);
        this.queue.sort((a, b) => b.priority - a.priority);
        // Enforce max size
        if (this.queue.length > this.maxQueueSize) {
            this.queue = this.queue.slice(0, this.maxQueueSize);
        }
        // Save to IndexedDB
        if (this.db) {
            try {
                const tx = this.db.transaction('queue', 'readwrite');
                const store = tx.objectStore('queue');
                store.put(item);
            }
            catch (error) {
                console.error('[LocalCache] Failed to save queue item to DB:', error);
            }
        }
        return item.id;
    }
    /**
     * Get next item from queue
     */
    async dequeue() {
        if (this.queue.length === 0) {
            return null;
        }
        const item = this.queue.shift();
        // Delete from IndexedDB
        if (this.db) {
            try {
                const tx = this.db.transaction('queue', 'readwrite');
                const store = tx.objectStore('queue');
                store.delete(item.id);
            }
            catch (error) {
                console.error('[LocalCache] Failed to delete queue item from DB:', error);
            }
        }
        return item;
    }
    /**
     * Peek at next item without removing
     */
    peek() {
        return this.queue[0] || null;
    }
    /**
     * Get queue length
     */
    get queueLength() {
        return this.queue.length;
    }
    /**
     * Clear queue
     */
    async clearQueue() {
        this.queue = [];
        if (this.db) {
            try {
                const tx = this.db.transaction('queue', 'readwrite');
                const store = tx.objectStore('queue');
                store.clear();
            }
            catch (error) {
                console.error('[LocalCache] Failed to clear queue from DB:', error);
            }
        }
    }
    /**
     * Get cache stats
     */
    getStats() {
        let memoryUsage = 0;
        for (const entry of this.cache.values()) {
            memoryUsage += JSON.stringify(entry).length;
        }
        return {
            cacheSize: this.cache.size,
            queueSize: this.queue.length,
            memoryUsage,
        };
    }
}
// Singleton instance
export const localCache = new LocalCache();
