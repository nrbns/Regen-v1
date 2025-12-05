/**
 * Extract page content - tries IPC first, falls back to HTTP API
 */
export interface ExtractResult {
    title: string;
    content: string;
    html?: string;
    excerpt?: string;
    lang?: string;
}
/**
 * Extract readable content from a URL or tab
 * Tries Electron IPC first, then falls back to HTTP API
 */
export declare function extractContent(urlOrTabId: string): Promise<ExtractResult | null>;
