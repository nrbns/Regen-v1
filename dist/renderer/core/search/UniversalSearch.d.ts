/**
 * Universal Search - Search across history, bookmarks, workspace, files
 */
export interface SearchResult {
    id: string;
    type: 'history' | 'bookmark' | 'session' | 'note' | 'tab' | 'file';
    title: string;
    url?: string;
    snippet: string;
    timestamp?: number;
    score?: number;
}
export declare class UniversalSearch {
    /**
     * Search across all sources
     */
    static search(query: string, options?: {
        limit?: number;
        types?: SearchResult['type'][];
    }): Promise<SearchResult[]>;
    /**
     * Search browser history
     */
    private static searchHistory;
    /**
     * Search bookmarks
     */
    private static searchBookmarks;
    /**
     * Search sessions
     */
    private static searchSessions;
    /**
     * Search notes
     */
    private static searchNotes;
    /**
     * Search open tabs
     */
    private static searchTabs;
    /**
     * Get browser history
     */
    private static getHistory;
    /**
     * Get bookmarks
     */
    private static getBookmarks;
    /**
     * Get open tabs
     */
    private static getOpenTabs;
    /**
     * Extract snippet with highlighted query
     */
    private static extractSnippet;
    /**
     * Calculate relevance score
     */
    private static calculateScore;
    /**
     * Real-time search with debouncing
     */
    static createSearchDebounced(delay?: number): (query: string, callback: (results: SearchResult[]) => void) => void;
}
