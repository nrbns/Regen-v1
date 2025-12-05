/**
 * Metrics Collection - Tier 2
 * Performance timings, scrape metrics, AI agent execution traces
 */
export interface Metric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    tags?: Record<string, string>;
}
export interface ScrapeMetric {
    url: string;
    duration: number;
    size: number;
    cached: boolean;
    timestamp: number;
}
export interface AgentMetric {
    agentId: string;
    runId: string;
    duration: number;
    tokensUsed?: number;
    success: boolean;
    timestamp: number;
}
export declare class MetricsCollector {
    private metrics;
    private scrapeMetrics;
    private agentMetrics;
    private maxMetrics;
    /**
     * Record a metric
     */
    record(name: string, value: number, unit?: string, tags?: Record<string, string>): void;
    /**
     * Record scrape metric
     */
    recordScrape(metric: ScrapeMetric): void;
    /**
     * Record agent metric
     */
    recordAgent(metric: AgentMetric): void;
    /**
     * Get metrics by name
     */
    getMetrics(name?: string, tags?: Record<string, string>): Metric[];
    /**
     * Get scrape metrics
     */
    getScrapeMetrics(): ScrapeMetric[];
    /**
     * Get agent metrics
     */
    getAgentMetrics(): AgentMetric[];
    /**
     * Get summary statistics
     */
    getSummary(): {
        totalMetrics: number;
        totalScrapes: number;
        totalAgentRuns: number;
        avgScrapeDuration: number;
        avgAgentDuration: number;
        agentSuccessRate: number;
    };
    /**
     * Clear all metrics
     */
    clear(): void;
}
export declare const metricsCollector: MetricsCollector;
/**
 * Performance timing helper
 */
export declare function timeFunction<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
