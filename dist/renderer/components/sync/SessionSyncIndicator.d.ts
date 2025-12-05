/**
 * Session Sync Indicator Component
 * Shows per-session cursor state, sync status, and last sync timestamp
 * Fixes multi-tab cursor UI bug
 */
interface SessionSyncIndicatorProps {
    className?: string;
    showSessionId?: boolean;
    compact?: boolean;
}
export declare function SessionSyncIndicator({ className, showSessionId, compact, }: SessionSyncIndicatorProps): import("react/jsx-runtime").JSX.Element;
export {};
