/**
 * Summarize Service - Tier 1
 * CATEGORY C FIX: Converted to SSE/WS subscription pattern instead of polling
 */
export interface SummarizeOptions {
    url?: string;
    text?: string;
    question?: string;
    maxWaitSeconds?: number;
    onToken?: (token: string) => void;
    onProgress?: (progress: string) => void;
}
export interface SummarizeResult {
    summary: string;
    answer?: string;
    highlights?: string[];
    model: string;
    jobId: string;
    sources: Array<{
        url: string;
        jobId: string;
        selector: string | null;
    }>;
    provenance: any;
}
export type SummarizeState = {
    status: 'idle';
} | {
    status: 'loading';
    progress?: string;
} | {
    status: 'success';
    result: SummarizeResult;
} | {
    status: 'error';
    error: string;
    code?: string;
};
/**
 * Summarize URL or text using the unified API
 * Handles all polling internally - frontend just waits for result
 */
export declare function summarize(options: SummarizeOptions): Promise<SummarizeResult>;
/**
 * Summarize with toast notifications for user feedback
 */
export declare function summarizeWithFeedback(options: SummarizeOptions): Promise<SummarizeResult | null>;
