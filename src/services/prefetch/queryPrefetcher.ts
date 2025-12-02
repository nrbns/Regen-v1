/**
 * Smart Prefetching Service - Future Enhancement #5
 * Predicts and pre-caches likely queries based on:
 * - User history
 * - Current context
 * - Time of day
 * - Recent searches
 */

import { getLRUCache, saveCachedEmbeddingLRU } from '../embedding/lruCache';
import { invoke } from '@tauri-apps/api/core';
import { useTabsStore } from '../../state/tabsStore';

export interface PrefetchPrediction {
  query: string;
  confidence: number;
  reason: string;
}

class QueryPrefetcher {
  private recentQueries: string[] = [];
  private maxRecentQueries = 50;
  private prefetchQueue: Set<string> = new Set();
  private isPrefetching = false;

  /**
   * Record a query for learning
   */
  recordQuery(query: string): void {
    // Add to recent queries (FIFO)
    this.recentQueries.push(query);
    if (this.recentQueries.length > this.maxRecentQueries) {
      this.recentQueries.shift();
    }

    // Trigger prefetch of related queries
    this.schedulePrefetch(query);
  }

  /**
   * Predict likely next queries
   */
  predictNextQueries(context?: {
    currentUrl?: string;
    currentTab?: string;
    timeOfDay?: number;
  }): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];

    // 1. Recent query continuation (high confidence)
    if (this.recentQueries.length > 0) {
      const lastQuery = this.recentQueries[this.recentQueries.length - 1];
      const words = lastQuery.split(' ');
      if (words.length > 1) {
        // Predict continuation
        const continuation = words.slice(0, -1).join(' ');
        predictions.push({
          query: continuation,
          confidence: 0.7,
          reason: 'Recent query continuation',
        });
      }
    }

    // 2. Related queries from history (medium confidence)
    const relatedQueries = this.findRelatedQueries(context?.currentUrl || '');
    relatedQueries.forEach(q => {
      predictions.push({
        query: q,
        confidence: 0.5,
        reason: 'Related to current context',
      });
    });

    // 3. Time-based predictions (low confidence)
    const timeBased = this.getTimeBasedQueries(context?.timeOfDay);
    timeBased.forEach(q => {
      predictions.push({
        query: q,
        confidence: 0.3,
        reason: 'Time-based pattern',
      });
    });

    // Sort by confidence
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Prefetch embeddings for predicted queries
   */
  async prefetchQueries(queries: string[]): Promise<void> {
    if (this.isPrefetching) {
      return; // Already prefetching
    }

    this.isPrefetching = true;

    try {
      // Filter out already cached
      const cache = getLRUCache();
      const uncachedQueries: string[] = [];

      for (const query of queries) {
        // Check if already cached
        const encoder = new TextEncoder();
        const data = encoder.encode(`${query}:nomic-embed-text:4bit`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const cached = await cache.get(hash);
        if (!cached) {
          uncachedQueries.push(query);
        }
      }

      // Prefetch uncached queries (with rate limiting)
      for (const query of uncachedQueries.slice(0, 3)) {
        // Limit to 3 concurrent prefetches
        if (this.prefetchQueue.has(query)) {
          continue; // Already queued
        }

        this.prefetchQueue.add(query);

        // Generate embedding in background
        this.prefetchEmbedding(query).finally(() => {
          this.prefetchQueue.delete(query);
        });
      }
    } finally {
      this.isPrefetching = false;
    }
  }

  /**
   * Prefetch embedding for a single query
   */
  private async prefetchEmbedding(query: string): Promise<void> {
    try {
      // Check if Tauri is available before calling
      const { isTauriRuntime } = await import('../../lib/env');
      if (!isTauriRuntime()) {
        return; // Silently skip in web mode
      }

      // Call Rust embed_text command
      const embedding = await invoke<number[]>('embed_text', {
        text: query,
        model: 'nomic-embed-text:4bit',
      });

      // Save to LRU cache
      await saveCachedEmbeddingLRU(query, embedding, 'nomic-embed-text:4bit');

      console.log('[Prefetcher] Prefetched embedding for:', query);
    } catch (error: any) {
      // Silently fail - Tauri API not available in web mode is expected
      if (error?.message?.includes('Tauri API not available')) {
        return;
      }
      // Only log unexpected errors
      if (error?.message && !error.message.includes('Tauri')) {
        console.warn('[Prefetcher] Failed to prefetch:', query, error);
      }
    }
  }

  /**
   * Schedule prefetch for related queries
   */
  private schedulePrefetch(_query: string): void {
    // Use requestIdleCallback to prefetch when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const predictions = this.predictNextQueries();
        this.prefetchQueries(predictions.map(p => p.query));
      });
    } else {
      // Fallback
      setTimeout(() => {
        const predictions = this.predictNextQueries();
        this.prefetchQueries(predictions.map(p => p.query));
      }, 2000);
    }
  }

  /**
   * Find related queries based on context
   */
  private findRelatedQueries(currentUrl: string): string[] {
    // Simple implementation: find queries that share words with recent queries
    const related: string[] = [];
    const urlWords = currentUrl
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const recentQuery of this.recentQueries.slice(-10)) {
      const queryWords = recentQuery.toLowerCase().split(/\s+/);
      const commonWords = queryWords.filter(w => urlWords.includes(w));
      if (commonWords.length > 0 && !related.includes(recentQuery)) {
        related.push(recentQuery);
      }
    }

    return related.slice(0, 3);
  }

  /**
   * Get time-based query predictions
   */
  private getTimeBasedQueries(timeOfDay?: number): string[] {
    const hour = timeOfDay || new Date().getHours();
    const queries: string[] = [];

    // Morning: news, weather, stocks
    if (hour >= 6 && hour < 12) {
      queries.push('news today', 'weather forecast', 'stock market');
    }
    // Afternoon: work, productivity
    else if (hour >= 12 && hour < 18) {
      queries.push('productivity tools', 'meeting notes', 'project management');
    }
    // Evening: entertainment, research
    else {
      queries.push('entertainment', 'research topics', 'learning resources');
    }

    return queries;
  }

  /**
   * Get prefetch statistics
   */
  getStats(): {
    recentQueries: number;
    queuedPrefetches: number;
    isPrefetching: boolean;
  } {
    return {
      recentQueries: this.recentQueries.length,
      queuedPrefetches: this.prefetchQueue.size,
      isPrefetching: this.isPrefetching,
    };
  }
}

// Singleton instance
let prefetcherInstance: QueryPrefetcher | null = null;

export function getQueryPrefetcher(): QueryPrefetcher {
  if (!prefetcherInstance) {
    prefetcherInstance = new QueryPrefetcher();
  }
  return prefetcherInstance;
}

/**
 * Initialize prefetcher and start background prefetching
 */
export function initializePrefetcher(): void {
  const prefetcher = getQueryPrefetcher();

  // Listen to search queries
  // This would be integrated with the search component
  // For now, we'll expose the recordQuery function

  // Start periodic prefetching based on context
  setInterval(() => {
    const tabsState = useTabsStore.getState();
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);

    if (activeTab?.url) {
      const predictions = prefetcher.predictNextQueries({
        currentUrl: activeTab.url,
        currentTab: activeTab.id,
        timeOfDay: new Date().getHours(),
      });

      if (predictions.length > 0) {
        prefetcher.prefetchQueries(predictions.map(p => p.query));
      }
    }
  }, 30000); // Check every 30 seconds

  console.log('[Prefetcher] Initialized');
}
