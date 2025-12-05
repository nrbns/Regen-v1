/**
 * Progressive Loading Utility - Future Enhancement #4
 * Lazy load non-critical features to improve initial load time
 * Uses dynamic imports with intelligent prefetching
 */
import React from 'react';
export interface LazyLoadOptions {
    priority?: 'high' | 'medium' | 'low';
    prefetch?: boolean;
    timeout?: number;
    fallback?: () => React.ComponentType<any>;
}
/**
 * Lazy load a module with error handling and prefetching
 */
export declare function lazyLoad<T = any>(importFn: () => Promise<{
    default: T;
}>, options?: LazyLoadOptions): {
    load: () => Promise<T>;
    prefetch: () => void;
    isLoaded: () => boolean;
};
/**
 * Prefetch critical routes on idle
 */
export declare function prefetchOnIdle(importFn: () => Promise<any>): void;
/**
 * Lazy load route component with Suspense fallback
 */
export declare function createLazyRoute(importFn: () => Promise<{
    default: React.ComponentType<any>;
}>, options?: LazyLoadOptions): React.LazyExoticComponent<React.ComponentType<any>>;
/**
 * Prefetch multiple modules in parallel (with concurrency limit)
 */
export declare function prefetchModules(importFns: Array<() => Promise<any>>, concurrency?: number): Promise<void>;
export declare function trackModuleLoad(moduleName: string, startTime: number): void;
export declare function getModuleLoadStats(): Record<string, number>;
