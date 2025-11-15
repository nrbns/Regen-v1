/**
 * Settings Store - Zustand store for settings management
 * Syncs with Electron backend via IPC
 */

import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';
// @ts-ignore - Electron shared types outside rootDir
import type { Settings } from '../../electron/shared/settings/schema';

interface SettingsStore {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSetting: (path: string[], value: unknown) => Promise<void>;
  updateCategory: (category: keyof Settings, values: Partial<Settings[keyof Settings]>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => Promise<{ success: boolean; path?: string }>;
  importSettings: () => Promise<{ success: boolean; settings?: Settings }>;
  
  // Getters
  getCategory: <K extends keyof Settings>(category: K) => Settings[K] | null;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await ipc.settings.get() as Settings;
      set({ settings, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load settings';
      set({ error: message, loading: false });
      console.error('[SettingsStore] Failed to load settings:', error);
    }
  },

  updateSetting: async (path: string[], value: unknown) => {
    try {
      await ipc.settings.set(path, value);
      // Reload settings to get updated values
      await get().loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update setting';
      set({ error: message });
      console.error('[SettingsStore] Failed to update setting:', error);
      throw error;
    }
  },

  updateCategory: async (category: keyof Settings, values: Partial<Settings[keyof Settings]>) => {
    try {
      // Use the new setCategory method for batch updates
      const result = await ipc.settings.setCategory(category as string, values as Record<string, unknown>);
      if (result.success && result.settings) {
        set({ settings: result.settings as Settings });
      } else {
        // Fallback: reload settings
        await get().loadSettings();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update category';
      set({ error: message });
      console.error('[SettingsStore] Failed to update category:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      const result = await ipc.settings.reset();
      if (result.success && result.settings) {
        set({ settings: result.settings as Settings });
      }
      await get().loadSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset settings';
      set({ error: message });
      console.error('[SettingsStore] Failed to reset settings:', error);
      throw error;
    }
  },

  exportSettings: async () => {
    try {
      const result = await ipc.settings.exportAll();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export settings';
      set({ error: message });
      console.error('[SettingsStore] Failed to export settings:', error);
      return { success: false };
    }
  },

  importSettings: async () => {
    try {
      const result = await ipc.settings.importAll() as any;
      if (result.success && result.settings) {
        set({ settings: result.settings as Settings });
      }
      return {
        success: result.success,
        settings: result.settings as Settings | undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import settings';
      set({ error: message });
      console.error('[SettingsStore] Failed to import settings:', error);
      return { success: false };
    }
  },

  getCategory: <K extends keyof Settings>(category: K): Settings[K] | null => {
    const { settings } = get();
    if (!settings) return null;
    return settings[category] || null;
  },
}));

// Auto-load settings on store creation
if (typeof window !== 'undefined') {
  useSettingsStore.getState().loadSettings().catch(console.error);
}

