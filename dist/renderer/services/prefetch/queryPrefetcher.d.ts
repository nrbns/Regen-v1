/**
 * Smart Prefetching Service - Future Enhancement #5
 * Predicts and pre-caches likely queries based on:
 * - User history
 * - Current context
 * - Time of day
 * - Recent searches
 */
export interface PrefetchPrediction {
    query: string;
    confidence: number;
    reason: string;
}
declare class QueryPrefetcher {
    private recentQueries;
    private maxRecentQueries;
    private prefetchQueue;
    private isPrefetching;
    /**
     * Record a query for learning
     */
    recordQuery(query: string): void;
    /**
     * Predict likely next queries
     */
    predictNextQueries(context?: {
        currentUrl?: string;
        currentTab?: string;
        timeOfDay?: number;
    }): PrefetchPrediction[];
    /**
     * Prefetch embeddings for predicted queries
     */
    prefetchQueries(queries: string[]): Promise<void>;
    /**
     * Prefetch embedding for a single query
     */
    private prefetchEmbedding;
    /**
     * Schedule prefetch for related queries
     */
    private schedulePrefetch;
    /**
     * Find related queries based on context
     */
    private findRelatedQueries;
    /**
     * Get time-based query predictions
     */
    private getTimeBasedQueries;
    /**
     * Get prefetch statistics
     */
    getStats(): {
        recentQueries: number;
        queuedPrefetches: number;
        isPrefetching: boolean;
    };
}
export declare function getQueryPrefetcher(): QueryPrefetcher;
/**
 * Initialize prefetcher and start background prefetching
 */
export declare function initializePrefetcher(): void;
export {};
