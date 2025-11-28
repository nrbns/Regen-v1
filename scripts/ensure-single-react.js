const { existsSync, rmSync } = require('node:fs');
const { join } = require('node:path');

/**
 * Ensures Vitest only sees a single copy of React by removing the nested
 * node_modules inside tauri-migration (which pulls in its own React/ReactDOM).
 * Duplicate React copies trigger "Invalid hook call" errors during tests.
 */
const tauriNodeModules = join(process.cwd(), 'tauri-migration', 'node_modules');

if (existsSync(tauriNodeModules)) {
  console.warn(
    '[vitest] Removing tauri-migration/node_modules to prevent duplicate React instances during tests.'
  );
  rmSync(tauriNodeModules, { recursive: true, force: true });
}
