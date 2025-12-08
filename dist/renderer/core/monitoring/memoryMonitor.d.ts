/**
 * Memory Monitor
 * Tracks RAM usage and auto-unloads tabs when memory is low
 */
export interface MemoryStats {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    percentage: number;
}
/**
 * Get current memory usage
 */
export declare function getMemoryUsage(): MemoryStats | null;
/**
 * Phase 1, Day 2: Check if memory is low (improved for 4GB devices)
 */
export declare function isMemoryLow(): boolean;
/**
 * Start memory monitoring
 */
export declare function startMemoryMonitoring(onLowMemory?: () => void, onCritical?: () => void): void;
/**
 * Stop memory monitoring
 */
export declare function stopMemoryMonitoring(): void;
/**
 * Unload inactive tabs to free memory
 */
export declare function unloadInactiveTabs(): Promise<number>;
