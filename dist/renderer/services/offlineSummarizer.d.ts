/**
 * Offline Summarization Service
 * Uses mBART model for multilingual summarization when offline
 * Falls back to simple extraction when model unavailable
 */
export interface SummarizationOptions {
    maxLength?: number;
    minLength?: number;
    language?: string;
    useOfflineModel?: boolean;
}
export interface SummarizationResult {
    summary: string;
    confidence: number;
    method: 'mbart' | 'extraction' | 'fallback';
    language?: string;
}
/**
 * Summarize text using offline mBART model (if available) or extraction
 */
export declare function summarizeOffline(text: string, options?: SummarizationOptions): Promise<SummarizationResult>;
/**
 * Summarize multiple texts and combine
 */
export declare function summarizeMultiple(texts: string[], options?: SummarizationOptions): Promise<SummarizationResult>;
