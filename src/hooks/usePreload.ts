/**
 * usePreload Hook
 * Preload resources when component mounts or dependencies change
 */

import { useEffect } from 'react';
import { preloadResource, prefetchResource } from '../lib/performance/preload';

export interface UsePreloadOptions {
  preload?: Array<{ href: string; as: 'script' | 'style' | 'font' | 'image' | 'fetch' }>;
  prefetch?: string[];
  deps?: unknown[];
}

/**
 * Preload resources when component mounts
 */
export function usePreload(options: UsePreloadOptions): void {
  const { preload = [], prefetch = [], deps = [] } = options;

  useEffect(() => {
    // Preload resources
    preload.forEach(({ href, as }) => {
      preloadResource(href, as);
    });

    // Prefetch resources
    prefetch.forEach((href) => {
      prefetchResource(href);
    });
  }, deps); // Re-run if deps change
}


