/**
 * Tab Suspension Service - Advanced tab lifecycle management
 * Implements suspend/resume with IndexedDB snapshotting for memory optimization
 *
 * Tab States: active → idle → suspended → resumed
 */
export type TabState = 'active' | 'idle' | 'suspended' | 'resumed';
interface TabSnapshot {
    tabId: string;
    url: string;
    title: string;
    html: string;
    scrollPosition: {
        x: number;
        y: number;
    };
    timestamp: number;
}
/**
 * Save tab snapshot to IndexedDB
 */
export declare function saveTabSnapshot(tabId: string, snapshot: Omit<TabSnapshot, 'tabId' | 'timestamp'>): Promise<void>;
/**
 * Load tab snapshot from IndexedDB
 */
export declare function loadTabSnapshot(tabId: string): Promise<TabSnapshot | null>;
/**
 * Delete tab snapshot from IndexedDB
 */
export declare function deleteTabSnapshot(tabId: string): Promise<void>;
/**
 * Mark tab as active (user interaction)
 */
export declare function markTabActive(tabId: string): void;
/**
 * Resume a suspended tab
 */
export declare function resumeTab(tabId: string): Promise<TabSnapshot | null>;
/**
 * Get current tab state
 */
export declare function getTabState(tabId: string): TabState;
/**
 * Check if tab is suspended
 */
export declare function isTabSuspended(tabId: string): boolean;
/**
 * Cleanup: Remove all timeouts and clear state
 */
export declare function cleanupTabSuspension(tabId: string): void;
/**
 * Initialize tab suspension for a tab
 */
export declare function initTabSuspension(tabId: string): void;
/**
 * PR: Performance optimization - Suspend inactive tabs on window blur
 * Reduces memory usage when user switches away from the app
 */
export declare function setupBlurSuspension(): () => void;
export {};
