/**
 * LRU (Least Recently Used) Cache implementation
 * DAY 5-6 FIX: Prevents unlimited cache growth
 */
export declare class LRUCache<K, V> {
    private cache;
    private maxSize;
    private ttl?;
    constructor(maxSize?: number, ttl?: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    size(): number;
    getMaxSize(): number;
    cleanup(): number;
}
export declare const searchCache: LRUCache<string, any>;
export declare const pageCache: LRUCache<string, any>;
export declare const apiCache: LRUCache<string, any>;
