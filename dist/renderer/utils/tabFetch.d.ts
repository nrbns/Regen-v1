/**
 * Tab Fetch Utility
 * Prevents stale async responses from overwriting tab state
 * Uses AbortController and per-tab request tokens
 */
export interface TabFetchOptions {
    signal?: AbortSignal;
    timeout?: number;
    headers?: Record<string, string>;
}
/**
 * Fetch tab content with abort support
 */
export declare function fetchTabContent(url: string, options?: TabFetchOptions): Promise<unknown>;
/**
 * Create a per-tab fetch manager
 */
export declare class TabFetchManager {
    private abortControllers;
    private requestIds;
    /**
     * Fetch content for a specific tab
     * Automatically cancels previous requests for the same tab
     */
    fetchForTab(tabId: string, url: string, options?: Omit<TabFetchOptions, 'signal'>): Promise<unknown>;
    /**
     * Cancel all pending requests for a tab
     */
    cancelTab(tabId: string): void;
    /**
     * Cancel all pending requests
     */
    cancelAll(): void;
    /**
     * Clean up (call on unmount)
     */
    destroy(): void;
}
export declare const globalTabFetchManager: TabFetchManager;
