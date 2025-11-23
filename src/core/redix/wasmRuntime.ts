/**
 * Redix WASM Runtime Bridge
 *
 * Wraps the Rust/wasm hot+cold memory runtime compiled under `redix-core/runtime`.
 * Provides async helpers for snapshotting tabs, restoring them, and persisting AI context.
 */

// Type-only import to avoid build errors when WASM isn't built yet
// The actual module will be dynamically imported at runtime
type WasmBindingsModule = {
  default?: () => Promise<void>;
  RedixRuntime: new (maxHotEntries: number, coldBudgetBytes: number) => WasmRuntimeInstance;
};

type WasmRuntimeInstance = {
  snapshotTab(
    tabId: string,
    payload: { state: unknown; meta?: Record<string, unknown> }
  ): Record<string, unknown>;
  restoreTab(tabId: string): Record<string, unknown> | null;
  saveContext(key: string, value: unknown): void;
  fetchContext(key: string): Record<string, unknown> | null;
  stats(): Record<string, unknown>;
  clear(): void;
};

type _WasmBindings = WasmBindingsModule;

let loadPromise: Promise<WasmBindingsModule> | null = null;
let runtimeInstance: WasmRuntimeInstance | null = null;
let runtimeOptions: RedixRuntimeOptions | undefined;

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
export async function ensureRedixRuntime(options: RedixRuntimeOptions = {}): Promise<void> {
  if (runtimeInstance) {
    return;
  }

  runtimeOptions = options;
  const bindings = await loadWasmBindings();

  if (typeof bindings.default === 'function') {
    await bindings.default();
  }

  runtimeInstance = new bindings.RedixRuntime(
    options.maxHotEntries ?? 8,
    options.coldBytes ?? 64 * 1024 * 1024
  );
}

/**
 * Create or update a snapshot for a tab.
 */
export async function snapshotTab(payload: SnapshotPayload): Promise<SnapshotResult> {
  const runtime = await getRuntime();
  const result = runtime.snapshotTab(payload.tabId, {
    state: payload.state,
    meta: normalizeMeta(payload.meta),
  });
  return result as SnapshotResult;
}

/**
 * Restore a tab snapshot, promoting cold entries back to the hot store when necessary.
 */
export async function restoreTab(tabId: string): Promise<RestoredSnapshot | null> {
  const runtime = await getRuntime();
  const restored = runtime.restoreTab(tabId);
  if (!restored) {
    return null;
  }
  return restored as RestoredSnapshot;
}

/**
 * Save arbitrary context (AI prompt memory, summaries, etc.).
 */
export async function saveContext(key: string, value: unknown): Promise<void> {
  const runtime = await getRuntime();
  runtime.saveContext(key, value);
}

/**
 * Fetch previously persisted context.
 */
export async function fetchContext<T = unknown>(
  key: string
): Promise<{ key: string; updated_at: number; value: T } | null> {
  const runtime = await getRuntime();
  const result = runtime.fetchContext(key);
  return (result || null) as any;
}

/**
 * Runtime telemetry for dashboards + alerts.
 */
export async function getRuntimeStats(): Promise<RuntimeStats> {
  const runtime = await getRuntime();
  const stats = runtime.stats();
  return stats as RuntimeStats;
}

/**
 * Tear down in-memory stores (primarily for tests).
 */
export async function resetRedixRuntime(): Promise<void> {
  if (!runtimeInstance) return;
  runtimeInstance.clear();
  runtimeInstance = null;
  loadPromise = null;
}

async function getRuntime(): Promise<WasmRuntimeInstance> {
  if (!runtimeInstance) {
    await ensureRedixRuntime(runtimeOptions);
  }
  if (!runtimeInstance) {
    throw missingWasmError();
  }
  return runtimeInstance;
}

function normalizeMeta(meta?: SnapshotMeta): SnapshotMeta | undefined {
  if (!meta) return undefined;
  return {
    title: meta.title,
    url: meta.url,
    appMode: meta.appMode,
    containerId: meta.containerId,
    approxMemoryMB: meta.approxMemoryMB,
  };
}

async function loadWasmBindings(): Promise<WasmBindingsModule> {
  if (!loadPromise) {
    // Dynamic import with type assertion - module may not exist at build time
    loadPromise = (async () => {
      try {
        // @ts-expect-error - Module may not exist at build time, will fail gracefully at runtime
        const module = await import('../../../redix-core/runtime/pkg/redix_runtime');
        return module as WasmBindingsModule;
      } catch (error) {
        console.error('[RedixRuntime] Failed to import WASM bundle', error);
        throw missingWasmError();
      }
    })();
  }
  return loadPromise;
}

function missingWasmError(): Error {
  return new Error(
    [
      'Redix WASM runtime is not built.',
      'Run `cd redix-core/runtime && wasm-pack build --target web --out-dir pkg`',
      'or `npm run build` inside that directory, then restart Vite/Electron.',
    ].join(' ')
  );
}
