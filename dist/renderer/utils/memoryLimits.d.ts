/**
 * Memory Limits - Test and enforce memory constraints for low-end devices
 */
/**
 * Check current memory usage
 */
export declare function getMemoryUsage(): {
    usedMB: number;
    totalMB: number;
    limitMB: number;
    percentage: number;
};
/**
 * Check if memory usage is high
 */
export declare function isMemoryHigh(): boolean;
/**
 * Check if memory limit is exceeded
 */
export declare function isMemoryExceeded(): boolean;
/**
 * Force garbage collection if available (Chrome DevTools)
 */
export declare function forceGarbageCollection(): void;
/**
 * Monitor memory and take action if needed
 */
export declare function startMemoryMonitoring(intervalMs?: number): () => void;
