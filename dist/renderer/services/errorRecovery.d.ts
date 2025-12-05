/**
 * Error Recovery - Auto-restart and graceful degradation
 */
/**
 * Record a crash and attempt recovery
 */
export declare function recordCrash(error: Error, context?: Record<string, any>): void;
/**
 * Get crash count
 */
export declare function getCrashCount(): number;
/**
 * Reset crash count
 */
export declare function resetCrashCount(): void;
