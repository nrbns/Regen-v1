export type MultiSourceProvider = 'brave' | 'bing' | 'duckduckgo' | 'custom' | string;
export interface MultiSourceSearchResult {
    title: string;
    url: string;
    snippet: string;
    source: MultiSourceProvider;
    score: number;
    domain: string;
    metadata?: Record<string, unknown>;
}
export interface MultiSourceSearchOptions {
    limit?: number;
    language?: string;
}
export declare function multiSourceSearch(query: string, options?: MultiSourceSearchOptions): Promise<MultiSourceSearchResult[]>;
