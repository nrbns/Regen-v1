/**
 * Redix WASM Runtime Bridge
 *
 * Wraps the Rust/wasm hot+cold memory runtime compiled under `redix-core/runtime`.
 * Provides async helpers for snapshotting tabs, restoring them, and persisting AI context.
 */
export type SnapshotMeta = {
    title?: string;
    url?: string;
    appMode?: string;
    containerId?: string;
    approxMemoryMB?: number;
};
export type SnapshotPayload = {
    tabId: string;
    state: unknown;
    meta?: SnapshotMeta;
};
export type SnapshotResult = {
    tabId: string;
    storedIn: 'hot' | 'cold';
    evicted?: string | null;
    hotEntries: number;
    coldEntries: number;
    coldBytes: number;
};
export type RestoredSnapshot = {
    tabId: string;
    state: unknown;
    meta?: SnapshotMeta;
    source: string;
};
export type RuntimeStats = {
    hotEntries: number;
    coldEntries: number;
    coldBytes: number;
    maxHotEntries: number;
    coldBudgetBytes: number;
    evictionCount: number;
};
export type RedixRuntimeOptions = {
    maxHotEntries?: number;
    coldBytes?: number;
};
/**
 * Ensure the WASM runtime is loaded and instantiated.
 */
export declare function ensureRedixRuntime(options?: RedixRuntimeOptions): Promise<void>;
/**
 * Create or update a snapshot for a tab.
 */
export declare function snapshotTab(payload: SnapshotPayload): Promise<SnapshotResult>;
/**
 * Restore a tab snapshot, promoting cold entries back to the hot store when necessary.
 */
export declare function restoreTab(tabId: string): Promise<RestoredSnapshot | null>;
/**
 * Save arbitrary context (AI prompt memory, summaries, etc.).
 */
export declare function saveContext(key: string, value: unknown): Promise<void>;
/**
 * Fetch previously persisted context.
 */
export declare function fetchContext<T = unknown>(key: string): Promise<{
    key: string;
    updated_at: number;
    value: T;
} | null>;
/**
 * Runtime telemetry for dashboards + alerts.
 */
export declare function getRuntimeStats(): Promise<RuntimeStats>;
/**
 * Tear down in-memory stores (primarily for tests).
 */
export declare function resetRedixRuntime(): Promise<void>;
