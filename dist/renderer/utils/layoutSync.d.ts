/**
 * Layout Sync Utility - PR: Fix layout overlap issues
 * Keeps CSS variables in sync with actual component heights
 */
/**
 * Update bottom bar height CSS variable
 */
export declare function updateBottomBarHeight(): void;
/**
 * Update topbar height CSS variable
 */
export declare function updateTopbarHeight(): void;
/**
 * Update sidebar width CSS variable
 */
export declare function updateSidebarWidth(): void;
/**
 * Initialize layout sync - call on mount
 */
export declare function initLayoutSync(): () => void;
