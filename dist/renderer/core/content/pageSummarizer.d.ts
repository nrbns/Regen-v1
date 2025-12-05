/**
 * Page Summarizer - Real-time page content extraction and summarization
 */
export interface PageContent {
    url: string;
    title: string;
    text: string;
    html?: string;
    images?: string[];
    links?: string[];
}
export declare class PageSummarizer {
    /**
     * Extract page content from active tab
     */
    static extractPageContent(tabId: string): Promise<PageContent>;
    /**
     * Extract content from current window (fallback)
     */
    private static extractFromCurrentWindow;
    /**
     * Summarize page with real-time AI
     */
    static summarizePage(content: PageContent, length?: 'short' | 'medium' | 'long'): Promise<any>;
    /**
     * Stream summarization (real-time)
     */
    static streamSummarization(content: PageContent, length: "short" | "medium" | "long" | undefined, onChunk: (text: string, fullText: string) => void, onDone: (fullText: string) => void): Promise<void>;
    /**
     * Extract keywords from text (simple fallback)
     */
    private static extractKeywords;
}
