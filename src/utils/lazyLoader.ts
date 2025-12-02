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
export function lazyLoad<T = any>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): {
  load: () => Promise<T>;
  prefetch: () => void;
  isLoaded: () => boolean;
} {
  let module: T | null = null;
  let loadPromise: Promise<T> | null = null;
  let prefetched = false;

  const load = async (): Promise<T> => {
    if (module) {
      return module;
    }

    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = importFn()
      .then(mod => {
        module = mod.default;
        return module;
      })
      .catch(error => {
        loadPromise = null;
        console.error('[LazyLoader] Failed to load module:', error);
        if (options.fallback) {
          const Fallback = options.fallback();
          return Fallback as T;
        }
        throw error;
      });

    return loadPromise;
  };

  const prefetch = (): void => {
    if (prefetched || module) {
      return;
    }
    prefetched = true;
    // Start loading in background
    load().catch(() => {
      // Silently fail prefetch
    });
  };

  const isLoaded = (): boolean => {
    return module !== null;
  };

  // Auto-prefetch if option enabled
  if (options.prefetch) {
    // Prefetch based on priority
    const delay = options.priority === 'high' ? 0 : options.priority === 'medium' ? 1000 : 3000;
    setTimeout(prefetch, delay);
  }

  return { load, prefetch, isLoaded };
}

/**
 * Prefetch critical routes on idle
 */
export function prefetchOnIdle(importFn: () => Promise<any>): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently fail
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail
      });
    }, 2000);
  }
}

/**
 * Lazy load route component with Suspense fallback
 */
export function createLazyRoute(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  options: LazyLoadOptions = {}
): React.LazyExoticComponent<React.ComponentType<any>> {
  return React.lazy(() =>
    importFn().catch(error => {
      console.error('[LazyLoader] Route load failed:', error);
      if (options.fallback) {
        return { default: options.fallback() };
      }
      // Return error component
      return {
        default: () => {
          return React.createElement(
            'div',
            { className: 'p-4 text-red-400' },
            'Failed to load component. Please refresh the page.'
          );
        },
      };
    })
  );
}

/**
 * Prefetch multiple modules in parallel (with concurrency limit)
 */
export async function prefetchModules(
  importFns: Array<() => Promise<any>>,
  concurrency: number = 3
): Promise<void> {
  const queue = [...importFns];
  const inFlight: Promise<any>[] = [];

  while (queue.length > 0 || inFlight.length > 0) {
    // Start new requests up to concurrency limit
    while (inFlight.length < concurrency && queue.length > 0) {
      const importFn = queue.shift()!;
      const promise = importFn()
        .catch(() => {
          // Silently fail
        })
        .finally(() => {
          const index = inFlight.indexOf(promise);
          if (index > -1) {
            inFlight.splice(index, 1);
          }
        });
      inFlight.push(promise);
    }

    // Wait for at least one to complete
    if (inFlight.length > 0) {
      await Promise.race(inFlight);
    }
  }
}

/**
 * Track module load times for analytics
 */
const loadTimes = new Map<string, number>();

export function trackModuleLoad(moduleName: string, startTime: number): void {
  const loadTime = performance.now() - startTime;
  loadTimes.set(moduleName, loadTime);
  console.log(`[LazyLoader] ${moduleName} loaded in ${loadTime.toFixed(2)}ms`);
}

export function getModuleLoadStats(): Record<string, number> {
  return Object.fromEntries(loadTimes.entries());
}
