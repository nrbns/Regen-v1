/**
 * Settings Service - Complete settings management
 * Wraps storage.ts with enhanced functionality
 */

// app and registerStorageIpc not used directly in this module
import { getCurrentSettings } from './storage';
import { Settings, SettingsSchema, defaultSettings, mergeSettings } from '../shared/settings/schema';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';

/**
 * Get all settings
 */
export function getSettings(): Settings {
  return getCurrentSettings();
}

/**
 * Update settings (partial update)
 */
export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = getCurrentSettings();
  const merged = mergeSettings({ ...current, ...partial });
  
  // Save via storage service (handled by IPC handler)
  
  return merged;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<Settings> {
  const defaults = defaultSettings;
  // Save defaults
  return defaults;
}

/**
 * Register settings IPC handlers
 */
export function registerSettingsIpc() {
  // Storage IPC is already registered in main.ts, so we don't need to call it again
  
  // Additional settings-specific handlers
  registerHandler('settings:reset', z.object({}), async () => {
    const defaults = defaultSettings;
    // Reset via storage - update root settings to defaults
    const storageModule = await import('./storage');
    await (storageModule as any).updateRootSettings(defaults);
    return { success: true, settings: defaults };
  });
  
  registerHandler('settings:getCategory', z.object({
    category: z.enum(['general', 'privacy', 'network', 'downloads', 'ai', 'appearance', 'performance', 'diagnostics', 'startup']),
  }), async (_event, request) => {
    const settings = getCurrentSettings();
    const category = request.category;
    return (settings as any)[category] || {};
  });
  
  registerHandler('settings:setCategory', z.object({
    category: z.enum(['general', 'privacy', 'network', 'downloads', 'ai', 'appearance', 'performance', 'diagnostics', 'startup']),
    values: z.record(z.unknown()),
  }), async (_event, request) => {
    const current = getCurrentSettings();
    const updated = {
      ...current,
      [request.category]: {
        ...(current as any)[request.category],
        ...request.values,
      },
    };
    const validated = SettingsSchema.parse(updated);
    // Save via storage service - use the exported updateRootSettings function
    const storageModule = await import('./storage');
    await (storageModule as any).updateRootSettings(validated);
    return { success: true, settings: validated };
  });
}

