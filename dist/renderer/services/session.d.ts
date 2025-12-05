/**
 * Session Service - Tier 1
 * Handles saving and restoring browser sessions
 */
import type { Tab } from '../state/tabsStore';
import type { AppState } from '../state/appStore';
export type SessionState = {
    tabs: Tab[];
    activeTabId: string | null;
    mode: AppState['mode'];
    savedAt: number;
};
/**
 * Save session to localStorage
 */
export declare function saveSession(state: SessionState): void;
/**
 * Load session from localStorage
 */
export declare function loadSession(): SessionState | null;
/**
 * Clear saved session
 */
export declare function clearSession(): void;
/**
 * Debounced save - waits for quiet period before saving
 */
export declare function debouncedSaveSession(state: SessionState): void;
/**
 * Get session summary for UI display
 */
export declare function getSessionSummary(): {
    tabCount: number;
    savedAt: number | null;
} | null;
