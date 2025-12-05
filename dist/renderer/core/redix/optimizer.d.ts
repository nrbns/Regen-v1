/**
 * Redix Resource Optimizer
 * Manages tab suspension, throttling, and resource allocation
 */
export interface ResourcePolicy {
    suspendBackgroundTabs: boolean;
    suspendAfterMinutes: number;
    throttleHeavyTabs: boolean;
    memoryThreshold: number;
    cpuThreshold: number;
    batteryThreshold: number;
    prefetchEnabled: boolean;
    prefetchOnWifiOnly: boolean;
}
/**
 * Load policy from storage or use default
 */
export declare function loadPolicy(): Promise<ResourcePolicy>;
/**
 * Save policy to storage
 */
export declare function savePolicy(policy: Partial<ResourcePolicy>): void;
/**
 * Get current policy
 */
export declare function getPolicy(): ResourcePolicy;
/**
 * Suspend a tab (hibernate it to save resources)
 */
export declare function suspendTab(tabId: string): Promise<void>;
/**
 * Thaw (restore) a suspended tab
 */
export declare function thawTab(tabId: string): Promise<void>;
/**
 * Mark a tab as heavy (CPU/memory intensive)
 */
export declare function markTabHeavy(tabId: string, heavy: boolean): void;
/**
 * Check if tab is suspended
 */
export declare function isTabSuspended(tabId: string): boolean;
/**
 * Check if tab is marked as heavy
 */
export declare function isTabHeavy(tabId: string): boolean;
/**
 * Optimize performance based on current policy and system state
 */
export declare function optimizePerformance(metrics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    batteryLevel?: number;
}): Promise<void>;
/**
 * Initialize optimizer (load policy, set up listeners)
 */
export declare function initializeOptimizer(): Promise<void>;
