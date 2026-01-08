// Browser-safe shim for @tauri-apps/api
// Exports no-op implementations so imports succeed but nothing native runs in the browser.

export const invoke = async (_cmd?: string, _args?: any) => null;
export const listen = async (_event?: string, _cb?: any) => ({ unsubscribe: () => {} });
export const emit = async (_event?: string, _payload?: any) => {};

export const dialog = {
  message: async (_opts?: any) => null,
  ask: async (_opts?: any) => false,
};

export const fs = {
  readTextFile: async (_path?: string) => '',
  writeFile: async (_path?: string, _contents?: any) => {},
  exists: async (_path?: string) => false,
};

export const path = {
  resolve: (...parts: string[]) => parts.join('/'),
  join: (...parts: string[]) => parts.join('/'),
};

export const shell = {
  open: async (_path?: string) => {},
};

export const clipboard = {
  readText: async () => '',
  writeText: async (_text?: string) => {},
};

export const notification = {
  sendNotification: async (_opts?: any) => {},
};

export const appWindow = {
  listen: async (_evt?: string, _cb?: any) => ({ unsubscribe: () => {} }),
  emit: async (_evt?: string, _payload?: any) => {},
};

export const updater = {
  checkUpdate: async () => ({ shouldUpdate: false, manifest: null }),
  installUpdate: async () => {},
};

export default {
  invoke,
  listen,
  emit,
  dialog,
  fs,
  path,
  shell,
  clipboard,
  notification,
  appWindow,
  updater,
};
