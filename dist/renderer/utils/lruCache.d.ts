/**
 * LRU (Least Recently Used) Cache Implementation
 * Caps cache size to prevent memory leaks
 */
export declare class LRUCache<K, V> {
    private cache;
    private maxSize;
    constructor(maxSize?: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    get size(): number;
    get max(): number;
}
