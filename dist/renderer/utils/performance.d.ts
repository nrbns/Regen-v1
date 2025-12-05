/**
 * Performance monitoring utilities
 * Tracks startup time, memory usage, and performance metrics
 */
interface PerformanceMetrics {
    timeToFirstPaint?: number;
    timeToInteractive?: number;
    timeToLoad?: number;
    memoryUsage?: number;
}
declare class PerformanceMonitor {
    private startTime;
    private metrics;
    private observers;
    constructor();
    private init;
    private measureTTI;
    private monitorMemory;
    private trackNavigationTiming;
    private logMetric;
    getMetrics(): PerformanceMetrics;
    cleanup(): void;
}
export declare function initPerformanceMonitoring(): PerformanceMonitor;
export declare function getPerformanceMetrics(): PerformanceMetrics;
export {};
