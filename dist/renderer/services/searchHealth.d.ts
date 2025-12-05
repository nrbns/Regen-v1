/**
 * Search Health Check Service
 * Monitors MeiliSearch status and provides health indicators
 */
export type SearchHealthStatus = 'healthy' | 'degraded' | 'offline' | 'checking';
export interface SearchHealth {
    status: SearchHealthStatus;
    meiliSearch: boolean;
    localSearch: boolean;
    lastChecked: number;
    error?: string;
}
/**
 * Check search system health
 */
export declare function checkSearchHealth(): Promise<SearchHealth>;
/**
 * Get cached health status
 */
export declare function getSearchHealth(): SearchHealth | null;
/**
 * Start periodic health checks
 */
export declare function startSearchHealthMonitoring(intervalMs?: number): void;
/**
 * Stop health monitoring
 */
export declare function stopSearchHealthMonitoring(): void;
/**
 * Verify search system on startup
 */
export declare function verifySearchSystem(): Promise<{
    success: boolean;
    meiliSearch: boolean;
    localSearch: boolean;
    message: string;
}>;
