/**
 * Content Extraction
 * Extracts clean text from HTML using cheerio and Mozilla Readability
 * Handles canonical URLs, deduplication, and sanitization
 */
interface ExtractOptions {
    timeout?: number;
    userAgent?: string;
    maxLength?: number;
    extractMetadata?: boolean;
}
interface ExtractedContent {
    url: string;
    canonicalUrl?: string;
    title: string;
    text: string;
    excerpt?: string;
    lang?: string;
    metadata?: {
        author?: string;
        publishedTime?: string;
        description?: string;
        image?: string;
    };
    error?: string;
}
/**
 * Extract content from a URL with full pipeline
 */
export declare function extractContent(url: string, options?: ExtractOptions): Promise<ExtractedContent>;
/**
 * Extract content from multiple URLs in parallel
 */
export declare function extractMultipleContent(urls: string[], options?: ExtractOptions & {
    concurrency?: number;
}): Promise<ExtractedContent[]>;
export {};
