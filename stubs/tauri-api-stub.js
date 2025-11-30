/**
 * Tauri API Stub
 * DAY 10 FIX: Stub module to avoid Vite resolution errors when @tauri-apps/api is not installed
 * This allows the code to run in non-Tauri environments (web builds)
 */

// Stub for @tauri-apps/api/core
export function invoke(cmd, args) {
  console.warn(`[Tauri Stub] invoke('${cmd}', ...) called but Tauri is not available`);
  return Promise.reject(new Error('Tauri API not available'));
}

// Stub for @tauri-apps/api/event
export function listen(event, handler) {
  console.warn(`[Tauri Stub] listen('${event}', ...) called but Tauri is not available`);
  return Promise.resolve(() => {}); // Return a no-op unsubscribe function
}

export function emit(event, payload) {
  console.warn(`[Tauri Stub] emit('${event}', ...) called but Tauri is not available`);
  return Promise.resolve();
}

// Default export for module compatibility
export default {
  invoke,
  listen,
  emit,
};

