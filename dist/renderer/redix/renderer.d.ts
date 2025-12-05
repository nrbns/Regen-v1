/**
 * RedixContentRenderer - AI-Rendered Content (No iframes)
 *
 * Fetches, extracts, and renders web content as structured HTML.
 * Uses AI to process and summarize content instead of loading raw pages.
 */
import { RedixPool } from '../core/redix-pool';
import { RedixAI } from './ai';
export interface ProcessedContent {
    title: string;
    url: string;
    domain: string;
    summary: string;
    body: string;
    date?: string;
    author?: string;
    sources: Array<{
        url: string;
        title: string;
    }>;
}
export declare class RedixContentRenderer {
    private pool;
    private ai;
    constructor(pool: RedixPool, ai: RedixAI);
    /**
     * Render a URL as AI-processed content
     */
    renderURL(url: string, container: HTMLElement): Promise<void>;
    /**
     * Fetch content from URL
     */
    private fetchContent;
    /**
     * Extract readable content from HTML
     */
    private extractReadable;
    /**
     * Build HTML for rendered content
     */
    private buildContentHTML;
    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml;
    /**
     * Sanitize HTML content (basic - in production use DOMPurify)
     */
    private sanitizeHTML;
}
