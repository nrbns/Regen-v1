/**
 * Optimized Multi-Engine Search Service
 * Tries multiple search engines with intelligent fallbacks
 * Works with any query/name and optimizes results
 */
export interface OptimizedSearchResult {
    title: string;
    url: string;
    snippet: string;
    domain: string;
    provider: 'duckduckgo' | 'bing' | 'brave' | 'multi' | 'local' | 'fallback';
    score: number;
    timestamp: number;
}
export interface OptimizedSearchOptions {
    count?: number;
    language?: string;
    timeout?: number;
    preferProvider?: 'duckduckgo' | 'bing' | 'brave' | 'multi' | 'auto';
}
/**
 * Optimized search that tries multiple engines with intelligent fallbacks
 * Guarantees results for any query/name
 */
export declare function optimizedSearch(query: string, options?: OptimizedSearchOptions): Promise<OptimizedSearchResult[]>;
/**
 * Quick search - tries fastest providers first
 */
export declare function quickSearch(query: string, options?: OptimizedSearchOptions): Promise<OptimizedSearchResult[]>;
/**
 * Check which search providers are available
 */
export declare function checkSearchProviders(): Promise<{
    duckduckgo: boolean;
    bing: boolean;
    brave: boolean;
    multi: boolean;
    local: boolean;
}>;
