/**
 * Tauri API Stub for Testing
 * Provides mock implementations of Tauri APIs for test environments
 */

export const invoke = async (cmd, args = {}) => {
  // Mock implementation - returns empty object for most commands
  console.log('[Tauri Stub] invoke:', cmd, args);
  return {};
};

export const listen = (event, callback) => {
  // Mock implementation - returns a function to unsubscribe
  console.log('[Tauri Stub] listen:', event);
  return () => {};
};

export const emit = (event, payload) => {
  // Mock implementation
  console.log('[Tauri Stub] emit:', event, payload);
};

export default {
  invoke,
  listen,
  emit,
};