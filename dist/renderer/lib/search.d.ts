export declare function buildSearchUrl(provider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'startpage' | 'ecosia', q: string, language?: string, preferIframeFriendly?: boolean): string;
/**
 * Normalize input to URL or search query
 * Enhanced to properly detect non-URLs and convert to Google search in language
 */
export declare function normalizeInputToUrlOrSearch(input: string, provider?: 'google' | 'duckduckgo' | 'bing' | 'yahoo' | 'all', language?: string, preferIframeFriendly?: boolean): string;
