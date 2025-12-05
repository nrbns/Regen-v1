/**
 * Telemetry Metrics - Track performance, feature usage, and errors
 */
export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    metadata?: Record<string, any>;
}
export interface FeatureUsage {
    feature: string;
    count: number;
    lastUsed: number;
    metadata?: Record<string, any>;
}
export interface ErrorMetric {
    error: string;
    count: number;
    firstSeen: number;
    lastSeen: number;
    context?: Record<string, any>;
}
declare class TelemetryMetrics {
    private performanceMetrics;
    private featureUsage;
    private errorMetrics;
    private userFlows;
    /**
     * Track performance metric
     */
    trackPerformance(name: string, value: number, unit?: string, metadata?: Record<string, any>): void;
    /**
     * Track feature usage
     */
    trackFeature(feature: string, metadata?: Record<string, any>): void;
    /**
     * Track error
     */
    trackError(error: string, context?: Record<string, any>): void;
    /**
     * Track user flow
     */
    startFlow(flow: string): string;
    endFlow(flowId: string): void;
    /**
     * Get metrics summary
     */
    getSummary(): {
        performance: PerformanceMetric[];
        features: FeatureUsage[];
        errors: ErrorMetric[];
        flows: Array<{
            flow: string;
            duration: number;
        }>;
    };
    /**
     * Clear all metrics
     */
    clear(): void;
}
export declare const telemetryMetrics: TelemetryMetrics;
export {};
