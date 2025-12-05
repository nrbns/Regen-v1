/**
 * useSessionCursor Hook
 * React hook for managing session cursor state via Redis
 * Replaces file-based .cursor access
 */
interface SessionCursor {
    position?: {
        x: number;
        y: number;
    };
    scroll?: {
        top: number;
        left: number;
    };
    tabId?: string;
    url?: string;
    timestamp?: number;
    [key: string]: any;
}
interface UseSessionCursorReturn {
    cursor: SessionCursor | null;
    isLoading: boolean;
    error: string | null;
    updateCursor: (cursor: SessionCursor) => Promise<void>;
    refreshCursor: () => Promise<void>;
}
export declare function useSessionCursor(): UseSessionCursorReturn;
export {};
