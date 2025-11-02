/**
 * Plugin IPC Handlers
 * Register IPC handlers for plugin management
 */

import { ipcMain } from 'electron';
import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { loadPlugin, unloadPlugin, listPlugins, getPlugin } from './registry';

const PluginLoadRequest = z.object({
  pluginPath: z.string(),
});

const PluginUnloadRequest = z.object({
  pluginId: z.string(),
});

const PluginGetRequest = z.object({
  pluginId: z.string(),
});

export function registerPluginIpc(): void {
  // Register typed handlers
  registerHandler('plugins:load', PluginLoadRequest, async (_event, request) => {
    try {
      const plugin = await loadPlugin(request.pluginPath);
      return {
        id: plugin.id,
        name: plugin.manifest.name,
        version: plugin.manifest.version,
        permissions: plugin.manifest.permissions,
      };
    } catch (error) {
      throw new Error(`Failed to load plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  registerHandler('plugins:unload', PluginUnloadRequest, async (_event, request) => {
    try {
      await unloadPlugin(request.pluginId);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to unload plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  registerHandler('plugins:list', z.object({}), async () => {
    const plugins = listPlugins();
    return plugins.map(p => ({
      id: p.id,
      name: p.manifest.name,
      version: p.manifest.version,
      permissions: p.manifest.permissions,
      running: true, // Runtime is initialized
    }));
  });
  
  registerHandler('plugins:get', PluginGetRequest, async (_event, request) => {
    const plugin = getPlugin(request.pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    return {
      id: plugin.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      permissions: plugin.manifest.permissions,
      running: true,
    };
  });
  
  // Legacy handlers for backwards compatibility
  ipcMain.handle('plugins:load', async (_e, pluginPath: string) => {
    try {
      const plugin = await loadPlugin(pluginPath);
      return { ok: true, data: { id: plugin.id, name: plugin.manifest.name } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

