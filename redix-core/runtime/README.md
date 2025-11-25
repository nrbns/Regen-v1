# Redix Runtime Skeleton

Lightweight hot/cold memory runtime compiled to WebAssembly and consumed by the Regen renderer.  
This skeleton gives you:

1. A Rust `wasm-bindgen` crate that stores tab snapshots + contextual memories with hot/cold eviction.
2. `wasm-pack` build tooling.
3. TypeScript bridge (`src/core/redix/wasmRuntime.ts`) that exposes `snapshotTab`, `restoreTab`, `saveContext`, and `fetchContext`.

## Directory layout

```
redix-core/runtime/
 ├── Cargo.toml          # Rust crate definition
 ├── package.json        # wasm-pack helper scripts
 ├── src/lib.rs          # hot/cold store + snapshot API
 ├── pkg/                # (ignored) wasm-pack output, consumed by Vite/Electron
 └── README.md           # this file
```

## Prerequisites

- Rust 1.78+ (`rustup target add wasm32-unknown-unknown`)
- [`wasm-pack`](https://rustwasm.github.io/wasm-pack/installer/)
- Node 20+ for the Vite/Electron bridge

## Build steps

```bash
cd redix-core/runtime
wasm-pack build --target web --out-dir pkg
```

The command produces `pkg/redix_runtime_bg.wasm`, JS glue code, and TypeScript definitions that the renderer imports through Vite.

During development you can run:

```bash
npm install
npm run build
```

which wraps the `wasm-pack` invocation and keeps the toolchain locally scoped.

## Consuming from TypeScript

Once `pkg/` exists you can call the runtime via the new `src/core/redix/wasmRuntime.ts` helper:

```ts
import {
  ensureRedixRuntime,
  snapshotTab,
  restoreTab,
  saveContext,
  fetchContext,
} from '../../src/core/redix/wasmRuntime';

await ensureRedixRuntime({ maxHotEntries: 6, coldBytes: 32 * 1024 * 1024 });

await snapshotTab({
  tabId: 'tab-123',
  state: { scrollY: 420, form: { draft: 'Hello' } },
  meta: { title: 'Docs', url: 'https://regen.app/docs' },
});

const restored = await restoreTab('tab-123');
console.log(restored?.state);
```

If the WASM bundle is missing the helper throws a descriptive error so CI can remind you to run `wasm-pack build`.

## API surface exposed by WASM

| Function                                       | Description                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `snapshotTab(tabId, payload)`                  | Stores serialized tab state. Returns whether it stayed in the hot cache and which entry (if any) was evicted. |
| `restoreTab(tabId)`                            | Retrieves a snapshot from hot/cold stores and hydrates the tab (also re-promotes cold entries to hot).        |
| `saveContext(key, data)` / `fetchContext(key)` | Lightweight key-value memory for AI prompts or session metadata.                                              |
| `stats()`                                      | Returns telemetry (hot/cold counts, budgets, eviction counters) for dashboards.                               |

Each API uses `serde_wasm_bindgen` for zero-copy marshaling between Rust and TypeScript.

## Next steps

- Extend `lib.rs` with compression (e.g., `lz4_flex`) before writing to cold storage.
- Wire telemetry to Redix dashboards via the exposed `stats()` call.
- Add integration/unit tests (Rust + Vitest) once the skeleton is wired into CI.
