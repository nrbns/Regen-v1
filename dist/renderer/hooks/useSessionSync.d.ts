/**
 * useSessionSync Hook
 * Manages session synchronization state
 */
interface SessionSyncState {
    sessionId: string;
    isSynced: boolean;
    lastSyncTime: Date | null;
    syncError: string | null;
    retrySync: () => Promise<void>;
}
export declare function useSessionSync(): SessionSyncState;
export {};
