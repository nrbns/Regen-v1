/**
 * Layer 2: UI/UX Performance Optimizer
 * 
 * Implements:
 * 1. Layout reflow prevention
 * 2. Virtual scrolling for large lists
 * 3. Navigation preloading
 * 4. Render batching
 */

import { useEffect, useRef, useCallback } from 'react';
import { throttle } from 'lodash-es';

// ============================================================================
// 1. Layout Optimization - Prevent Reflows
// ============================================================================

/**
 * Batch DOM reads and writes to prevent layout thrashing
 */
export class LayoutOptimizer {
  private readQueue: Array<() => void> = [];
  private writeQueue: Array<() => void> = [];
  private frameId: number | null = null;

  /**
   * Queue a DOM read operation (measure)
   */
  read(callback: () => void): void {
    this.readQueue.push(callback);
    this.scheduleFlush();
  }

  /**
   * Queue a DOM write operation (mutate)
   */
  write(callback: () => void): void {
    this.writeQueue.push(callback);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.frameId !== null) return;

    this.frameId = requestAnimationFrame(() => {
      // Execute all reads first (batch)
      const reads = [...this.readQueue];
      this.readQueue = [];
      reads.forEach(fn => fn());

      // Then execute all writes (batch)
      const writes = [...this.writeQueue];
      this.writeQueue = [];
      writes.forEach(fn => fn());

      this.frameId = null;

      // If new operations were queued during execution, schedule again
      if (this.readQueue.length > 0 || this.writeQueue.length > 0) {
        this.scheduleFlush();
      }
    });
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.readQueue = [];
    this.writeQueue = [];
  }
}

// Singleton instance
let layoutOptimizerInstance: LayoutOptimizer | null = null;

export function getLayoutOptimizer(): LayoutOptimizer {
  if (!layoutOptimizerInstance) {
    layoutOptimizerInstance = new LayoutOptimizer();
  }
  return layoutOptimizerInstance;
}

// ============================================================================
// 2. Virtual Scrolling - Handle Large Lists
// ============================================================================

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Extra items to render above/below viewport
  onScroll?: (startIndex: number, endIndex: number) => void;
}

export class VirtualScroller {
  private itemHeight: number;
  private containerHeight: number;
  private overscan: number;
  private scrollTop = 0;
  private totalItems = 0;

  constructor(options: VirtualScrollOptions) {
    this.itemHeight = options.itemHeight;
    this.containerHeight = options.containerHeight;
    this.overscan = options.overscan || 3;
  }

  /**
   * Get visible range of items
   */
  getVisibleRange(totalItems: number, scrollTop: number): { start: number; end: number; offset: number } {
    this.totalItems = totalItems;
    this.scrollTop = scrollTop;

    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const endIndex = Math.min(totalItems, startIndex + visibleCount + this.overscan * 2);
    const offset = startIndex * this.itemHeight;

    return { start: startIndex, end: endIndex, offset };
  }

  /**
   * Get total height of virtual list
   */
  getTotalHeight(): number {
    return this.totalItems * this.itemHeight;
  }
}

/**
 * React hook for virtual scrolling
 */
export function useVirtualScroll<T>(items: T[], options: VirtualScrollOptions) {
  const scrollerRef = useRef<VirtualScroller | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0, offset: 0 });

  // Initialize scroller
  useEffect(() => {
    scrollerRef.current = new VirtualScroller(options);
    updateVisibleRange(0);
  }, [options.itemHeight, options.containerHeight, options.overscan]);

  const updateVisibleRange = useCallback(
    (scrollTop: number) => {
      if (!scrollerRef.current) return;
      const range = scrollerRef.current.getVisibleRange(items.length, scrollTop);
      setVisibleRange(range);
      options.onScroll?.(range.start, range.end);
    },
    [items.length, options.onScroll]
  );

  // Throttled scroll handler (60fps)
  const handleScroll = useCallback(
    throttle((e: Event) => {
      const target = e.target as HTMLDivElement;
      updateVisibleRange(target.scrollTop);
    }, 16),
    [updateVisibleRange]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const totalHeight = scrollerRef.current?.getTotalHeight() || 0;

  return {
    containerRef,
    visibleItems,
    visibleRange,
    totalHeight,
    offset: visibleRange.offset,
  };
}

// ============================================================================
// 3. Navigation Preloading
// ============================================================================

export interface PreloadOptions {
  priority?: 'high' | 'low';
  delay?: number;
}

export class NavigationPreloader {
  private preloadedUrls = new Set<string>();
  private preloadQueue: Array<{ url: string; priority: 'high' | 'low' }> = [];
  private isProcessing = false;

  /**
   * Preload a URL (fetch and cache)
   */
  async preload(url: string, options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedUrls.has(url)) {
      return; // Already preloaded
    }

    this.preloadQueue.push({
      url,
      priority: options.priority || 'low',
    });

    // Sort by priority (high first)
    this.preloadQueue.sort((a, _b) => (a.priority === 'high' ? -1 : 1));

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.preloadQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.preloadQueue.shift();
    if (!item) return;

    try {
      // Use link preload for high priority
      if (item.priority === 'high') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'document';
        link.href = item.url;
        document.head.appendChild(link);
      } else {
        // Use fetch with low priority for background preload
        await fetch(item.url, {
          method: 'GET',
          priority: 'low' as RequestPriority,
          credentials: 'same-origin',
        }).catch(() => {
          // Silently fail - preload is non-critical
        });
      }

      this.preloadedUrls.add(item.url);
    } catch (error) {
      console.warn('[NavigationPreloader] Failed to preload:', item.url, error);
    }

    // Process next item
    setTimeout(() => this.processQueue(), 100); // 100ms delay between preloads
  }

  /**
   * Prefetch likely next pages based on current page
   */
  prefetchLikelyPages(currentPath: string): void {
    // Smart prefetch logic based on common navigation patterns
    const predictions = this.predictNextPages(currentPath);
    predictions.forEach(url => this.preload(url, { priority: 'low' }));
  }

  private predictNextPages(currentPath: string): string[] {
    // Simple heuristic: prefetch common navigation paths
    const predictions: string[] = [];

    if (currentPath === '/') {
      predictions.push('/settings', '/history', '/ai-search');
    } else if (currentPath === '/settings') {
      predictions.push('/', '/history');
    } else if (currentPath.startsWith('/w/')) {
      predictions.push('/history', '/playbooks');
    }

    return predictions;
  }

  /**
   * Clear all preload state
   */
  clear(): void {
    this.preloadedUrls.clear();
    this.preloadQueue = [];
  }
}

// Singleton instance
let preloaderInstance: NavigationPreloader | null = null;

export function getNavigationPreloader(): NavigationPreloader {
  if (!preloaderInstance) {
    preloaderInstance = new NavigationPreloader();
  }
  return preloaderInstance;
}

// ============================================================================
// 4. Render Batching - Debounced Updates
// ============================================================================

/**
 * Batch render updates to reduce re-renders
 */
export class RenderBatcher {
  private updateQueue = new Map<string, () => void>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private batchDelay: number;

  constructor(batchDelay: number = 16) {
    // Default 16ms (1 frame at 60fps)
    this.batchDelay = batchDelay;
  }

  /**
   * Queue a render update
   */
  queueUpdate(id: string, callback: () => void): void {
    this.updateQueue.set(id, callback);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return; // Already scheduled
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  private flush(): void {
    this.flushTimer = null;

    // Execute all queued updates in RAF
    requestAnimationFrame(() => {
      const updates = Array.from(this.updateQueue.values());
      this.updateQueue.clear();

      updates.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.error('[RenderBatcher] Update error:', error);
        }
      });
    });
  }

  /**
   * Cancel all pending updates
   */
  cancel(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.updateQueue.clear();
  }
}

// Singleton instance
let renderBatcherInstance: RenderBatcher | null = null;

export function getRenderBatcher(): RenderBatcher {
  if (!renderBatcherInstance) {
    renderBatcherInstance = new RenderBatcher();
  }
  return renderBatcherInstance;
}

// ============================================================================
// 5. React Hook Integration
// ============================================================================

/**
 * Hook for optimized layout updates
 */
export function useOptimizedLayout() {
  const optimizer = useRef(getLayoutOptimizer());

  return {
    read: useCallback((fn: () => void) => optimizer.current.read(fn), []),
    write: useCallback((fn: () => void) => optimizer.current.write(fn), []),
  };
}

/**
 * Hook for batched render updates
 */
export function useBatchedRender(id: string) {
  const batcher = useRef(getRenderBatcher());

  return useCallback(
    (fn: () => void) => {
      batcher.current.queueUpdate(id, fn);
    },
    [id]
  );
}

// ============================================================================
// 6. Export React namespace reference
// ============================================================================

// Ensure React import for hooks
import React from 'react';
