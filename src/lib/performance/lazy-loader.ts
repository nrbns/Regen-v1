/**
 * Lazy Loader Utilities
 * Enhanced lazy loading with error handling and retry logic
 */

import { ComponentType, lazy, LazyExoticComponent } from 'react';

export interface LazyLoadOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  fallback?: ComponentType;
}

/**
 * Create a lazy-loaded component with error handling and retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const { retries = 3, retryDelay = 1000, timeout = 10000 } = options;

  return lazy(async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Import timeout')), timeout);
        });

        const module = await Promise.race([importFn(), timeoutPromise]);
        return module;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[LazyLoader] Import attempt ${attempt + 1}/${retries + 1} failed:`,
          error
        );

        if (attempt < retries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to load component after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  });
}

/**
 * Preload a lazy component before it's needed
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  importFn().catch((error) => {
    console.warn('[LazyLoader] Preload failed:', error);
  });
}

/**
 * Prefetch multiple components in parallel
 */
export function prefetchComponents(importFns: Array<() => Promise<any>>): Promise<void[]> {
  return Promise.all(
    importFns.map((fn) =>
      fn().catch((error) => {
        console.warn('[LazyLoader] Prefetch failed:', error);
      })
    )
  );
}


