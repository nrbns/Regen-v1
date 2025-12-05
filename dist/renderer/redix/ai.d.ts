/**
 * RedixAI - AI Processing for Content
 *
 * Processes web content using:
 * 1. WASM AI (offline, fast, universal) - preferred
 * 2. Redix backend (if available)
 * 3. Cloud LLM (if API key available)
 * 4. Simple keyword extraction (fallback)
 */
export interface RedixAIOptions {
    useWASM?: boolean;
    useCloud?: boolean;
    redixUrl?: string;
}
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
export declare class RedixAI {
    private options;
    private wasmLoaded;
    private redixUrl;
    constructor(options?: RedixAIOptions);
    /**
     * Process content (extract, summarize, structure)
     *
     * In Ghost Mode: Only uses WASM AI or simple extraction (no cloud APIs)
     */
    processContent(extracted: {
        title: string;
        text: string;
        html: string;
    }): Promise<ProcessedContent>;
    /**
     * Check if WASM is available
     */
    private hasWASM;
    /**
     * Process content with WASM AI
     */
    private processWithWASM;
    /**
     * Process content with Redix backend
     */
    private processWithRedix;
    /**
     * Simple content processing (fallback)
     */
    private processSimple;
    /**
     * Extract domain from URL or title
     */
    private extractDomain;
}
