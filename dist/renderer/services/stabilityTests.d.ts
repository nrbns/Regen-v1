/**
 * Stability Tests - Run for extended periods to check for crashes/memory leaks
 */
export interface StabilityMetrics {
    startTime: number;
    duration: number;
    crashes: number;
    memoryLeaks: number[];
    errorCount: number;
    tabCount: number[];
    cpuUsage: number[];
}
/**
 * Start stability test (run for specified duration)
 */
export declare function startStabilityTest(durationMinutes?: number): void;
/**
 * Get current stability test metrics
 */
export declare function getStabilityMetrics(): StabilityMetrics;
/**
 * Record a crash/error during stability test
 */
export declare function recordStabilityError(): void;
/**
 * Check if stability test is running
 */
export declare function isStabilityTestRunning(): boolean;
