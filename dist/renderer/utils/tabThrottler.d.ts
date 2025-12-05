/**
 * Tab Throttler - Throttle background tabs to reduce CPU/battery drain
 */
/**
 * Throttle a function based on tab visibility
 * Only executes if tab is active or visible
 */
export declare function throttleForActiveTab<T extends (...args: any[]) => any>(func: T, tabId: string | null): (...args: Parameters<T>) => void;
/**
 * Check if a tab should be throttled (background tab)
 */
export declare function shouldThrottleTab(tabId: string | null): boolean;
