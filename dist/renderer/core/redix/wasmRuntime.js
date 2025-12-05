/**
 * Redix WASM Runtime Bridge
 *
 * Wraps the Rust/wasm hot+cold memory runtime compiled under `redix-core/runtime`.
 * Provides async helpers for snapshotting tabs, restoring them, and persisting AI context.
 */
let loadPromise = null;
let runtimeInstance = null;
let runtimeOptions;
/**
 * Ensure the WASM runtime is loaded and instantiated.
 */
export async function ensureRedixRuntime(options = {}) {
    if (runtimeInstance) {
        return;
    }
    runtimeOptions = options;
    const bindings = await loadWasmBindings();
    if (typeof bindings.default === 'function') {
        await bindings.default();
    }
    runtimeInstance = new bindings.RedixRuntime(options.maxHotEntries ?? 8, options.coldBytes ?? 64 * 1024 * 1024);
}
/**
 * Create or update a snapshot for a tab.
 */
export async function snapshotTab(payload) {
    const runtime = await getRuntime();
    const result = runtime.snapshotTab(payload.tabId, {
        state: payload.state,
        meta: normalizeMeta(payload.meta),
    });
    return result;
}
/**
 * Restore a tab snapshot, promoting cold entries back to the hot store when necessary.
 */
export async function restoreTab(tabId) {
    const runtime = await getRuntime();
    const restored = runtime.restoreTab(tabId);
    if (!restored) {
        return null;
    }
    return restored;
}
/**
 * Save arbitrary context (AI prompt memory, summaries, etc.).
 */
export async function saveContext(key, value) {
    const runtime = await getRuntime();
    runtime.saveContext(key, value);
}
/**
 * Fetch previously persisted context.
 */
export async function fetchContext(key) {
    const runtime = await getRuntime();
    const result = runtime.fetchContext(key);
    return (result || null);
}
/**
 * Runtime telemetry for dashboards + alerts.
 */
export async function getRuntimeStats() {
    const runtime = await getRuntime();
    const stats = runtime.stats();
    return stats;
}
/**
 * Tear down in-memory stores (primarily for tests).
 */
export async function resetRedixRuntime() {
    if (!runtimeInstance)
        return;
    runtimeInstance.clear();
    runtimeInstance = null;
    loadPromise = null;
}
async function getRuntime() {
    if (!runtimeInstance) {
        await ensureRedixRuntime(runtimeOptions);
    }
    if (!runtimeInstance) {
        throw missingWasmError();
    }
    return runtimeInstance;
}
function normalizeMeta(meta) {
    if (!meta)
        return undefined;
    return {
        title: meta.title,
        url: meta.url,
        appMode: meta.appMode,
        containerId: meta.containerId,
        approxMemoryMB: meta.approxMemoryMB,
    };
}
async function loadWasmBindings() {
    if (!loadPromise) {
        // Dynamic import with type assertion - module may not exist at build time
        loadPromise = (async () => {
            try {
                // @ts-expect-error - Module may not exist at build time, will fail gracefully at runtime
                const module = await import('../../../redix-core/runtime/pkg/redix_runtime');
                return module;
            }
            catch (error) {
                console.error('[RedixRuntime] Failed to import WASM bundle', error);
                throw missingWasmError();
            }
        })();
    }
    return loadPromise;
}
function missingWasmError() {
    return new Error([
        'Redix WASM runtime is not built.',
        'Run `cd redix-core/runtime && wasm-pack build --target web --out-dir pkg`',
        'or `npm run build` inside that directory, then restart Vite/Electron.',
    ].join(' '));
}
