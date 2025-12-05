/**
 * LRU (Least Recently Used) Cache Implementation
 * Caps cache size to prevent memory leaks
 */
export class LRUCache {
    cache;
    maxSize;
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }
        // Move to end (most recently used)
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            // Update existing - move to end
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
    get max() {
        return this.maxSize;
    }
}
