/**
 * Live Web Search Service
 * Provides unified interface for DuckDuckGo and Bing web search
 * Falls back gracefully when APIs are unavailable
 */
export interface LiveSearchResult {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    provider: 'bing' | 'duckduckgo';
    score: number;
}
export interface LiveSearchOptions {
    count?: number;
    language?: string;
    preferBing?: boolean;
}
/**
 * Perform live web search using available providers
 * Tries Bing first (if API key available), then DuckDuckGo
 */
export declare function performLiveWebSearch(query: string, options?: LiveSearchOptions): Promise<LiveSearchResult[]>;
/**
 * Check if live web search is available
 */
export declare function isLiveWebSearchAvailable(): boolean;
