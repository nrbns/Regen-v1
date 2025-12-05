/**
 * Bing Web Search API client
 * Requires BING_API_KEY environment variable
 */
export interface BingSearchResult {
    id: string;
    name: string;
    url: string;
    snippet: string;
    displayUrl: string;
    datePublished?: string;
    dateLastCrawled?: string;
}
export interface BingSearchResponse {
    webPages?: {
        value: BingSearchResult[];
        totalEstimatedMatches?: number;
    };
    rankingResponse?: any;
}
/**
 * Fetch web search results from Bing API
 */
export declare function fetchBingSearch(query: string, options?: {
    count?: number;
    offset?: number;
    language?: string;
    market?: string;
}): Promise<BingSearchResult[]>;
/**
 * Format Bing results for research mode
 */
export declare function formatBingResults(results: BingSearchResult[]): Array<{
    title: string;
    url: string;
    snippet: string;
    domain: string;
}>;
