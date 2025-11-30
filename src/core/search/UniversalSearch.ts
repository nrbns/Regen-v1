/**
 * Universal Search - Search across history, bookmarks, workspace, files
 */

import { SessionWorkspace } from '../workspace/SessionWorkspace';

export interface SearchResult {
  id: string;
  type: 'history' | 'bookmark' | 'session' | 'note' | 'tab' | 'file';
  title: string;
  url?: string;
  snippet: string;
  timestamp?: number;
  score?: number;
}

export class UniversalSearch {
  /**
   * Search across all sources
   */
  static async search(
    query: string,
    options: {
      limit?: number;
      types?: SearchResult['type'][];
    } = {}
  ): Promise<SearchResult[]> {
    const { limit = 50, types } = options;
    const results: SearchResult[] = [];

    // Search history
    if (!types || types.includes('history')) {
      const historyResults = await this.searchHistory(query);
      results.push(...historyResults);
    }

    // Search bookmarks
    if (!types || types.includes('bookmark')) {
      const bookmarkResults = await this.searchBookmarks(query);
      results.push(...bookmarkResults);
    }

    // Search sessions
    if (!types || types.includes('session')) {
      const sessionResults = await this.searchSessions(query);
      results.push(...sessionResults);
    }

    // Search notes
    if (!types || types.includes('note')) {
      const noteResults = await this.searchNotes(query);
      results.push(...noteResults);
    }

    // Search open tabs
    if (!types || types.includes('tab')) {
      const tabResults = await this.searchTabs(query);
      results.push(...tabResults);
    }

    // Sort by relevance score
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return results.slice(0, limit);
  }

  /**
   * Search browser history
   */
  private static async searchHistory(query: string): Promise<SearchResult[]> {
    try {
      const history = await this.getHistory();
      const lowerQuery = query.toLowerCase();

      return history
        .filter(
          item =>
            item.title.toLowerCase().includes(lowerQuery) ||
            item.url.toLowerCase().includes(lowerQuery)
        )
        .map(item => ({
          id: `history_${item.id}`,
          type: 'history' as const,
          title: item.title,
          url: item.url,
          snippet: this.extractSnippet(item.title, query),
          timestamp: item.timestamp,
          score: this.calculateScore(item.title, item.url, query),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Search bookmarks
   */
  private static async searchBookmarks(query: string): Promise<SearchResult[]> {
    try {
      const bookmarks = await this.getBookmarks();
      const lowerQuery = query.toLowerCase();

      return bookmarks
        .filter(
          bookmark =>
            bookmark.title.toLowerCase().includes(lowerQuery) ||
            bookmark.url.toLowerCase().includes(lowerQuery)
        )
        .map(bookmark => ({
          id: `bookmark_${bookmark.id}`,
          type: 'bookmark' as const,
          title: bookmark.title,
          url: bookmark.url,
          snippet: this.extractSnippet(bookmark.title, query),
          timestamp: bookmark.createdAt,
          score: this.calculateScore(bookmark.title, bookmark.url, query),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Search sessions
   */
  private static searchSessions(query: string): SearchResult[] {
    const sessions = SessionWorkspace.getAllSessions();
    const lowerQuery = query.toLowerCase();

    return sessions
      .filter(
        session =>
          session.title.toLowerCase().includes(lowerQuery) ||
          session.metadata.query?.toLowerCase().includes(lowerQuery) ||
          session.metadata.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
      )
      .map(session => ({
        id: `session_${session.id}`,
        type: 'session' as const,
        title: session.title,
        snippet: session.metadata.query || session.title,
        timestamp: session.updatedAt,
        score: this.calculateScore(session.title, session.metadata.query || '', query),
      }));
  }

  /**
   * Search notes
   */
  private static searchNotes(query: string): SearchResult[] {
    const sessions = SessionWorkspace.getAllSessions();
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    sessions.forEach(session => {
      session.notes.forEach(note => {
        if (
          note.content.toLowerCase().includes(lowerQuery) ||
          note.selection?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            id: `note_${note.id}`,
            type: 'note' as const,
            title: note.content.slice(0, 50) + (note.content.length > 50 ? '...' : ''),
            url: note.url,
            snippet: this.extractSnippet(note.content, query),
            timestamp: note.createdAt,
            score: this.calculateScore(note.content, note.selection || '', query),
          });
        }
      });
    });

    return results;
  }

  /**
   * Search open tabs
   */
  private static searchTabs(query: string): SearchResult[] {
    try {
      const tabs = this.getOpenTabs();
      const lowerQuery = query.toLowerCase();

      return tabs
        .filter(
          tab =>
            tab.title.toLowerCase().includes(lowerQuery) ||
            tab.url.toLowerCase().includes(lowerQuery)
        )
        .map(tab => ({
          id: `tab_${tab.id}`,
          type: 'tab' as const,
          title: tab.title,
          url: tab.url,
          snippet: this.extractSnippet(tab.title, query),
          score: this.calculateScore(tab.title, tab.url, query),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Get browser history
   */
  private static async getHistory(): Promise<
    Array<{ id: string; title: string; url: string; timestamp: number }>
  > {
    try {
      const stored = localStorage.getItem('regen-history');
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Get bookmarks
   */
  private static async getBookmarks(): Promise<
    Array<{ id: string; title: string; url: string; createdAt: number }>
  > {
    try {
      const stored = localStorage.getItem('regen-bookmarks');
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Get open tabs
   */
  private static getOpenTabs(): Array<{ id: string; title: string; url: string }> {
    try {
      // This would integrate with tabs store
      const stored = localStorage.getItem('regen-tabs');
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Extract snippet with highlighted query
   */
  private static extractSnippet(text: string, query: string, length: number = 150): string {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      return text.slice(0, length) + (text.length > length ? '...' : '');
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    let snippet = text.slice(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    // Highlight query
    const regex = new RegExp(`(${query})`, 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');

    return snippet;
  }

  /**
   * Calculate relevance score
   */
  private static calculateScore(title: string, url: string, query: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerUrl = url.toLowerCase();

    let score = 0;

    // Title match
    if (lowerTitle.includes(lowerQuery)) {
      score += 10;
      if (lowerTitle.startsWith(lowerQuery)) score += 5;
      if (lowerTitle === lowerQuery) score += 10;
    }

    // URL match
    if (lowerUrl.includes(lowerQuery)) {
      score += 5;
      if (lowerUrl.includes(lowerQuery + '.')) score += 3; // Domain match
    }

    // Exact word match
    const words = lowerQuery.split(' ');
    words.forEach(word => {
      if (lowerTitle.includes(word)) score += 2;
      if (lowerUrl.includes(word)) score += 1;
    });

    return score;
  }

  /**
   * Real-time search with debouncing
   */
  static createSearchDebounced(delay: number = 300) {
    let timeout: NodeJS.Timeout;

    return (query: string, callback: (results: SearchResult[]) => void) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (query.trim().length === 0) {
          callback([]);
          return;
        }
        const results = await this.search(query);
        callback(results);
      }, delay);
    };
  }
}
