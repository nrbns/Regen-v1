/**
 * Page Extractor - Extract clean text and metadata from DOM
 * Handles structured content, tables, and removes noise
 *
 * Simple utility function for "Ask about this page" feature
 */
/**
 * Simple page context extractor for "Ask about this page"
 * Returns basic title, URL, and text content
 *
 * Security: Sanitizes output to prevent XSS and limits content size
 */
export declare function extractPageContext(): {
    title: string;
    url: string;
    text: string;
};
export interface PageMetadata {
    title: string;
    description?: string;
    url: string;
    headings: Array<{
        level: number;
        text: string;
    }>;
    mainContent: string;
    tables?: Array<{
        headers: string[];
        rows: string[][];
    }>;
    links?: Array<{
        text: string;
        url: string;
    }>;
    images?: Array<{
        alt?: string;
        src: string;
    }>;
    author?: string;
    publishedDate?: string;
    wordCount: number;
    estimatedReadTime: number;
}
/**
 * Extract page content and metadata from DOM
 */
export declare function extractPageContent(document: Document, url?: string): PageMetadata;
/**
 * Extract page content from a URL (requires server-side or Electron context)
 * This is a placeholder - actual implementation depends on how you fetch pages
 */
export declare function extractPageContentFromUrl(_url: string): Promise<PageMetadata | null>;
/**
 * Format extracted content for LLM consumption
 */
export declare function formatForLLM(metadata: PageMetadata, includeStructured?: boolean): string;
