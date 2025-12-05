/**
 * Throttled Sync Utility
 * Batches and throttles CRDT/sync updates to prevent network storms
 */
/**
 * Create a throttled sync function that batches operations
 */
export function createThrottledSync(syncFn, waitMs = 300) {
    let timer = null;
    let pending = [];
    const flush = () => {
        if (pending.length === 0)
            return;
        const toSync = [...pending];
        pending = [];
        timer = null;
        syncFn(toSync);
    };
    return (op) => {
        pending.push(op);
        if (timer)
            return; // Already scheduled
        timer = setTimeout(flush, waitMs);
    };
}
/**
 * Create a debounced sync function (only sync after quiet period)
 */
export function createDebouncedSync(syncFn, waitMs = 500) {
    let timer = null;
    let pending = [];
    const flush = () => {
        if (pending.length === 0)
            return;
        const toSync = [...pending];
        pending = [];
        timer = null;
        syncFn(toSync);
    };
    return (op) => {
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
export function createBatchedSync(syncFn, maxBatchSize = 50, maxWaitMs = 300) {
    let timer = null;
    let pending = [];
    const flush = () => {
        if (pending.length === 0)
            return;
        const toSync = [...pending];
        pending = [];
        timer = null;
        syncFn(toSync);
    };
    return (op) => {
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
