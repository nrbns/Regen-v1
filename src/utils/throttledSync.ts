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
export function createThrottledSync(
  syncFn: SyncFunction,
  waitMs: number = 300
): (op: SyncOperation) => void {
  let timer: NodeJS.Timeout | null = null;
  let pending: SyncOperation[] = [];

  const flush = () => {
    if (pending.length === 0) return;

    const toSync = [...pending];
    pending = [];
    timer = null;

    syncFn(toSync);
  };

  return (op: SyncOperation) => {
    pending.push(op);

    if (timer) return; // Already scheduled

    timer = setTimeout(flush, waitMs);
  };
}

/**
 * Create a debounced sync function (only sync after quiet period)
 */
export function createDebouncedSync(
  syncFn: SyncFunction,
  waitMs: number = 500
): (op: SyncOperation) => void {
  let timer: NodeJS.Timeout | null = null;
  let pending: SyncOperation[] = [];

  const flush = () => {
    if (pending.length === 0) return;

    const toSync = [...pending];
    pending = [];
    timer = null;

    syncFn(toSync);
  };

  return (op: SyncOperation) => {
    pending.push(op);

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(flush, waitMs);
  };
}

/**
 * Create a batched sync with max batch size
 */
export function createBatchedSync(
  syncFn: SyncFunction,
  maxBatchSize: number = 50,
  maxWaitMs: number = 300
): (op: SyncOperation) => void {
  let timer: NodeJS.Timeout | null = null;
  let pending: SyncOperation[] = [];

  const flush = () => {
    if (pending.length === 0) return;

    const toSync = [...pending];
    pending = [];
    timer = null;

    syncFn(toSync);
  };

  return (op: SyncOperation) => {
    pending.push(op);

    // Flush immediately if batch is full
    if (pending.length >= maxBatchSize) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
      return;
    }

    // Otherwise schedule flush
    if (!timer) {
      timer = setTimeout(flush, maxWaitMs);
    }
  };
}



