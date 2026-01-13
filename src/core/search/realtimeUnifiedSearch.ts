/**
 * Realtime Unified Search
 * 
 * Provides real-time search across downloads, history, and bookmarks.
 * Emits events as results update, enabling instant UI feedback.
 */

import { regenEventBus } from '../events/eventBus';
import { useDownloadsStore } from '../../state/downloadsStore';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { ipc } from '../../lib/ipc-typed';

export interface UnifiedSearchResult {
  id: string;
  type: 'download' | 'history' | 'bookmark';
  title: string;
  url: string;
  subtitle?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface UnifiedSearchOptions {
  query: string;
  types?: ('download' | 'history' | 'bookmark')[];
  limit?: number;
  minQueryLength?: number;
}

type SearchListener = (results: UnifiedSearchResult[]) => void;

class RealtimeUnifiedSearch {
  private listeners: Set<SearchListener> = new Set();
  private currentQuery: string = '';
  private currentResults: UnifiedSearchResult[] = [];
  private searchTimeout: NodeJS.Timeout | null = null;
  private isSearching: boolean = false;
  private minQueryLength: number = 2;

  /**
   * Search across downloads, history, and bookmarks
   */
  async search(options: UnifiedSearchOptions): Promise<UnifiedSearchResult[]> {
    const {
      query,
      types = ['download', 'history', 'bookmark'],
      limit = 50,
      minQueryLength = 2,
    } = options;

    this.minQueryLength = minQueryLength;

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    return new Promise((resolve) => {
      this.searchTimeout = setTimeout(async () => {
        await this.performSearch(query, types, limit);
        resolve(this.currentResults);
      }, 150); // 150ms debounce for real-time feel
    });
  }

  /**
   * Perform the actual search
   */
  private async performSearch(
    query: string,
    types: ('download' | 'history' | 'bookmark')[],
    limit: number
  ): Promise<void> {
    if (query.length < this.minQueryLength) {
      this.currentResults = [];
      this.currentQuery = '';
      this.notifyListeners([]);
      return;
    }

    this.isSearching = true;
    this.currentQuery = query;
    const lowerQuery = query.toLowerCase();
    const results: UnifiedSearchResult[] = [];

    try {
      // Search downloads
      if (types.includes('download')) {
        const downloads = useDownloadsStore.getState().downloads;
        const downloadResults = downloads
          .filter((d) => {
            const filename = d.filename?.toLowerCase() || '';
            const url = d.url?.toLowerCase() || '';
            return filename.includes(lowerQuery) || url.includes(lowerQuery);
          })
          .slice(0, limit)
          .map((d): UnifiedSearchResult => ({
            id: d.id,
            type: 'download',
            title: d.filename || d.url,
            url: d.url,
            subtitle: `${d.status} • ${this.formatBytes(d.receivedBytes || 0)}`,
            timestamp: d.startedAt,
            metadata: {
              status: d.status,
              progress: d.progress,
              path: d.path,
            },
          }));
        results.push(...downloadResults);
      }

      // Search bookmarks
      if (types.includes('bookmark')) {
        const bookmarks = useBookmarksStore.getState().searchBookmarks(query);
        const bookmarkResults = bookmarks.slice(0, limit).map((b): UnifiedSearchResult => ({
          id: b.id,
          type: 'bookmark',
          title: b.title,
          url: b.url,
          subtitle: b.folder || b.tags?.join(', '),
          timestamp: b.createdAt,
          metadata: {
            folder: b.folder,
            tags: b.tags,
            description: b.description,
          },
        }));
        results.push(...bookmarkResults);
      }

      // Search history (async - requires IPC call)
      if (types.includes('history')) {
        try {
          const historyResults = await ipc.history.search(query);
          const historyItems = (Array.isArray(historyResults) ? historyResults : []).slice(0, limit);
          const historySearchResults: UnifiedSearchResult[] = historyItems.map((h: any): UnifiedSearchResult => ({
            id: h.id || `history-${h.timestamp || Date.now()}`,
            type: 'history',
            title: h.title || h.url,
            url: h.url,
            subtitle: this.formatTimestamp(h.timestamp || h.lastVisitTime),
            timestamp: h.timestamp || h.lastVisitTime,
            metadata: {
              visitCount: h.visitCount,
            },
          }));
          results.push(...historySearchResults);
        } catch (error) {
          console.error('[RealtimeUnifiedSearch] History search failed:', error);
        }
      }

      // Sort by relevance (exact matches first, then by timestamp)
      results.sort((a, b) => {
        const aExact = a.title.toLowerCase() === lowerQuery || a.url.toLowerCase() === lowerQuery;
        const bExact = b.title.toLowerCase() === lowerQuery || b.url.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      // Limit results
      this.currentResults = results.slice(0, limit);

      // Emit event for real-time updates
      regenEventBus.emit({
        type: 'COMMAND',
        payload: JSON.stringify({
          action: 'search_results',
          query,
          results: this.currentResults,
        }),
      });

      this.notifyListeners(this.currentResults);
    } catch (error) {
      console.error('[RealtimeUnifiedSearch] Search failed:', error);
      this.currentResults = [];
      this.notifyListeners([]);
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Subscribe to search result updates
   */
  onResults(listener: SearchListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current results
   */
  getCurrentResults(): UnifiedSearchResult[] {
    return [...this.currentResults];
  }

  /**
   * Get current query
   */
  getCurrentQuery(): string {
    return this.currentQuery;
  }

  /**
   * Check if currently searching
   */
  isCurrentlySearching(): boolean {
    return this.isSearching;
  }

  /**
   * Clear search results
   */
  clear(): void {
    this.currentQuery = '';
    this.currentResults = [];
    this.notifyListeners([]);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(results: UnifiedSearchResult[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(results);
      } catch (error) {
        console.error('[RealtimeUnifiedSearch] Listener error:', error);
      }
    });
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Format timestamp to relative time
   */
  private formatTimestamp(timestamp: number): string {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
}

// Singleton instance
export const realtimeUnifiedSearch = new RealtimeUnifiedSearch();

/**
 * Initialize realtime unified search
 */
export function initRealtimeUnifiedSearch(): () => void {
  console.log('[RealtimeUnifiedSearch] Initialized');
  
  // Listen for new downloads, bookmarks, history updates
  // and automatically update search results if a search is active
  const unsubscribeDownloads = useDownloadsStore.subscribe(() => {
    if (realtimeUnifiedSearch.getCurrentQuery()) {
      // Re-run search with current query
      const query = realtimeUnifiedSearch.getCurrentQuery();
      realtimeUnifiedSearch.search({ query }).catch(console.error);
    }
  });

  const unsubscribeBookmarks = useBookmarksStore.subscribe(() => {
    if (realtimeUnifiedSearch.getCurrentQuery()) {
      const query = realtimeUnifiedSearch.getCurrentQuery();
      realtimeUnifiedSearch.search({ query }).catch(console.error);
    }
  });

  return () => {
    unsubscribeDownloads();
    unsubscribeBookmarks();
    realtimeUnifiedSearch.clear();
    console.log('[RealtimeUnifiedSearch] Cleaned up');
  };
}
