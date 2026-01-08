// Simple CommonJS/ESM-friendly shim for @tauri-apps/api/core used in tests/dev
export function invoke(command, args) {
  if (typeof globalThis.mockInvoke === 'function') return globalThis.mockInvoke(command, args);
  return Promise.resolve(null);
}

export default { invoke };
