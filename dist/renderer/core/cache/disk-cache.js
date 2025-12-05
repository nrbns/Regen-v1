/**
 * Persistent Disk Cache - Tier 2
 * Uses IndexedDB for persistent storage with TTL support
 */
const DB_NAME = 'regen_cache';
const STORE_NAME = 'cache_entries';
const DB_VERSION = 1;
export class DiskCache {
    db = null;
    initPromise = null;
    constructor() {
        this.initPromise = this.init();
    }
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => {
                console.error('[DiskCache] Failed to open IndexedDB');
                reject(new Error('Failed to open IndexedDB'));
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }
    async ensureReady() {
        if (this.initPromise) {
            await this.initPromise;
        }
        if (!this.db) {
            throw new Error('IndexedDB not initialized');
        }
    }
    /**
     * Get value from disk cache
     */
    async get(key) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => {
                const entry = request.result;
                if (!entry) {
                    resolve(null);
                    return;
                }
                // Check TTL
                if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
                    // Expired, delete and return null
                    this.delete(key).catch(console.error);
                    resolve(null);
                    return;
                }
                resolve(entry.value);
            };
            request.onerror = () => {
                reject(new Error('Failed to read from cache'));
            };
        });
    }
    /**
     * Set value in disk cache
     */
    async set(key, value, ttl) {
        await this.ensureReady();
        const entry = {
            value,
            timestamp: Date.now(),
            ttl,
        };
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(entry, key);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(new Error('Failed to write to cache'));
            };
        });
    }
    /**
     * Delete key from cache
     */
    async delete(key) {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(new Error('Failed to delete from cache'));
            };
        });
    }
    /**
     * Clear all cache
     */
    async clear() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(new Error('Failed to clear cache'));
            };
        });
    }
    /**
     * Clean expired entries
     */
    async cleanExpired() {
        await this.ensureReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();
            let deleted = 0;
            request.onsuccess = event => {
                const cursor = event.target.result;
                if (cursor) {
                    const entry = cursor.value;
                    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                }
                else {
                    resolve(deleted);
                }
            };
            request.onerror = () => {
                reject(new Error('Failed to clean expired entries'));
            };
        });
    }
}
