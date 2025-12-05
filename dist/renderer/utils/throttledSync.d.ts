/**
 * Throttled Sync Utility
 * Batches and throttles CRDT/sync updates to prevent network storms
 */
export interface SyncOperation {
    type: string;
    data: unknown;
    timestamp: number;
}
export type SyncFunction = (operations: SyncOperation[]) => void | Promise<void>;
/**
 * Create a throttled sync function that batches operations
 */
export declare function createThrottledSync(syncFn: SyncFunction, waitMs?: number): (op: SyncOperation) => void;
/**
 * Create a debounced sync function (only sync after quiet period)
 */
export declare function createDebouncedSync(syncFn: SyncFunction, waitMs?: number): (op: SyncOperation) => void;
/**
 * Create a batched sync with max batch size
 */
export declare function createBatchedSync(syncFn: SyncFunction, maxBatchSize?: number, maxWaitMs?: number): (op: SyncOperation) => void;
