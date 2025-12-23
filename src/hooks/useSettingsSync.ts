/**
 * useSettingsSync - Sync settings from Rust (source of truth)
 *
 * This hook keeps Zustand cache in sync with Rust backend.
 * Rust owns the state, Zustand is just a UI cache.
 */

import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../lib/env';
import { useSettingsStore } from '../state/settingsStore';

/**
 * Sync settings from Rust backend to Zustand cache
 */
async function syncSettingsFromRust() {
  if (!isTauriRuntime()) {
    return; // Skip if not in Tauri
  }

  try {
    // Get all settings from Rust
    const settings = await invoke<any>('settings:get_all');

    // Update Zustand cache (not source of truth, just cache)
    if (settings) {
      // Map Rust settings to Zustand state
      useSettingsStore.setState({
        language: settings.language || 'en',
        // Note: Other settings fields can be mapped here as needed
        // For now, only language is synced as it's the primary setting in Rust
      });

      // Sync low-RAM mode if available
      if (settings.low_ram_mode !== undefined) {
        // Store in general settings (Zustand doesn't have direct lowRamMode field)
        useSettingsStore.setState(state => ({
          general: { ...state.general, lowRamMode: settings.low_ram_mode },
        }));
      }
    }
  } catch (error) {
    console.error('[useSettingsSync] Failed to sync settings from Rust:', error);
  }
}

/**
 * Hook to keep settings in sync with Rust backend
 *
 * - Syncs on mount
 * - Can be triggered manually via returned function
 */
export function useSettingsSync() {
  const syncSettings = useCallback(() => {
    syncSettingsFromRust();
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return; // Skip if not in Tauri
    }

    // Sync on mount
    syncSettings();
  }, [syncSettings]);

  return { syncSettings };
}
