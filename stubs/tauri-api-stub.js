// Minimal Tauri API stub for Storybook/Node environments
// Provides no-op async implementations so imports succeed during visual builds

export const invoke = async () => null;
export const listen = async () => ({ unsubscribe: () => {} });
export const emit = async () => {};

// Updater stubs
export const checkUpdate = async () => ({ shouldUpdate: false, manifest: null });
export const installUpdate = async () => {};
export const relaunch = async () => {};

// Window stubs
export const appWindow = {
  listen: async () => ({ unsubscribe: () => {} }),
  emit: async () => {},
};

// General info
export const getVersion = async () => '0.0.0';
export const getName = async () => 'omnibrowser-stub';

export default {
  invoke,
  listen,
  emit,
  checkUpdate,
  installUpdate,
  relaunch,
  appWindow,
  getVersion,
  getName,
};
