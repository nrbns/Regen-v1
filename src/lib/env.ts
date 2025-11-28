export const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process?.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as any).env &&
    (import.meta as any).env[key] !== undefined
  ) {
    return (import.meta as any).env[key];
  }
  return undefined;
};

export const isDevEnv = (): boolean => {
  const nodeMode = getEnvVar('NODE_ENV');
  if (nodeMode) {
    return nodeMode === 'development';
  }
  const viteMode = getEnvVar('MODE');
  return viteMode === 'development';
};

export const isTauriRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  // Check for Tauri runtime
  return !!(window as any).__TAURI__;
};

export const isElectronRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for Tauri first (Tauri also has IPC)
  if (isTauriRuntime()) {
    return false; // Tauri is not Electron
  }

  // Check for IPC bridge (most reliable indicator)
  const maybeIpc = (window as any).ipc;
  if (maybeIpc && typeof maybeIpc.invoke === 'function') {
    return true;
  }

  // Check for legacy electron API
  if ((window as any).electron) {
    return true;
  }

  // Check for user agent (fallback)
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.includes('Electron');
  }

  return false;
};
