/**
 * Tauri Compatibility Utilities
 * Provides fallbacks and compatibility checks for Tauri, Electron, and Web modes
 */

import { isTauriRuntime, isElectronRuntime, isDevEnv } from '../lib/env';

/**
 * Safely invoke Tauri command with fallback
 */
export async function safeTauriInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
  fallback?: T
): Promise<T | null> {
  if (!isTauriRuntime()) {
    return fallback ?? null;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<T>(command, args);
    return result;
  } catch (error) {
    if (isDevEnv()) {
      console.warn(`[TauriCompatibility] Command ${command} failed:`, error);
    }
    return fallback ?? null;
  }
}

/**
 * Get system info with fallback
 */
export async function getSystemInfoSafe(): Promise<{
  total_ram_gb: number;
  available_ram_gb: number;
  cpu_cores: number;
} | null> {
  const result = await safeTauriInvoke<{
    total_ram_gb: number;
    available_ram_gb: number;
    cpu_cores: number;
  }>('get_system_info');

  if (result) {
    return result;
  }

  // Fallback: Use conservative defaults
  return {
    total_ram_gb: 8,
    available_ram_gb: 4,
    cpu_cores: 4,
  };
}

/**
 * Check if IPC is available
 */
export function isIPCAvailable(): boolean {
  if (isTauriRuntime()) {
    return typeof window !== 'undefined' && typeof (window as any).__TAURI__ !== 'undefined';
  }
  if (isElectronRuntime()) {
    return typeof window !== 'undefined' && typeof (window as any).ipc !== 'undefined';
  }
  return false;
}

/**
 * Safe IPC call with error handling
 */
export async function safeIPCCall<T>(
  method: string,
  args?: unknown,
  fallback?: T
): Promise<T | null> {
  if (!isIPCAvailable()) {
    return fallback ?? null;
  }

  try {
    if (isTauriRuntime()) {
      const { invoke } = await import('@tauri-apps/api/core');
      return (await invoke<T>(method, args)) ?? fallback ?? null;
    } else if (isElectronRuntime()) {
      const ipc = (window as any).ipc;
      if (ipc && typeof ipc[method] === 'function') {
        return (await ipc[method](args)) ?? fallback ?? null;
      }
    }
  } catch (error) {
    if (isDevEnv()) {
      console.warn(`[TauriCompatibility] IPC call ${method} failed:`, error);
    }
  }

  return fallback ?? null;
}
