/**
 * SuperMemory Tracking Integration
 * Auto-tracking hooks and utilities for browser components
 */
/**
 * Auto-track page visits when tabs navigate
 * Call this in tab navigation handlers
 */
export declare function autoTrackVisit(url: string, title?: string, tabId?: string): Promise<void>;
/**
 * Auto-track search queries
 * Call this when user performs a search
 */
export declare function autoTrackSearch(query: string, searchEngine?: string, clickedResult?: {
    url: string;
    title: string;
    position: number;
}): Promise<void>;
/**
 * Auto-track mode switches
 * Call this when user changes browser mode
 */
export declare function autoTrackModeSwitch(fromMode: string, toMode: string, _reason?: string): Promise<void>;
/**
 * React hook to auto-track visits for active tab
 */
export declare function useAutoTrackVisits(): void;
/**
 * React hook to auto-track mode switches
 */
export declare function useAutoTrackModeSwitches(): void;
