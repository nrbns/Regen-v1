/**
 * Sync Service - Tier 3 Pillar 3
 * Sync workspaces, settings, bookmarks across devices
 */
export type SyncData = {
    workspaces: unknown[];
    bookmarks: unknown[];
    settings: unknown;
    version: number;
    syncedAt: number;
};
export type SyncConflict = {
    type: 'workspace' | 'bookmark' | 'setting';
    local: unknown;
    remote: unknown;
    key: string;
};
declare class SyncService {
    private syncEnabled;
    private lastSyncAt;
    private syncInProgress;
    /**
     * Enable sync
     */
    enable(): Promise<boolean>;
    /**
     * Disable sync
     */
    disable(): void;
    /**
     * Check if sync is enabled
     */
    isEnabled(): boolean;
    /**
     * Pull data from server
     */
    pull(): Promise<SyncData | null>;
    /**
     * Push data to server
     */
    push(): Promise<boolean>;
    /**
     * Sync (pull + merge + push)
     */
    sync(): Promise<{
        success: boolean;
        conflicts?: SyncConflict[];
    }>;
    /**
     * Merge remote data with local (last-write-wins for v1)
     */
    private merge;
    /**
     * Get last sync time
     */
    getLastSyncAt(): number | null;
    /**
     * Auto-sync on interval
     */
    startAutoSync(intervalMs?: number): void;
}
export declare const syncService: SyncService;
export {};
