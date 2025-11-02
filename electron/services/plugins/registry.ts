/**
 * Plugin Registry
 * Manages plugin discovery, loading, and lifecycle
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateManifest, PluginManifest } from '../../shared/plugins/manifest';
import { PluginRuntime } from './runtime';

export interface LoadedPlugin {
  id: string;
  manifest: PluginManifest;
  runtime: PluginRuntime;
  path: string;
}

const plugins = new Map<string, LoadedPlugin>();

/**
 * Load a plugin from a directory
 */
export async function loadPlugin(pluginPath: string): Promise<LoadedPlugin> {
  const manifestPath = join(pluginPath, 'manifest.json');
  
  if (!existsSync(manifestPath)) {
    throw new Error(`Plugin manifest not found: ${manifestPath}`);
  }
  
  const manifestData = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const validation = validateManifest(manifestData);
  
  if (!validation.success) {
    throw new Error(`Invalid plugin manifest: ${validation.error}`);
  }
  
  const manifest = validation.manifest;
  const pluginId = `${manifest.name}@${manifest.version}`;
  
  if (plugins.has(pluginId)) {
    return plugins.get(pluginId)!;
  }
  
  const runtime = new PluginRuntime(pluginId, manifest, pluginPath);
  await runtime.initialize();
  
  const plugin: LoadedPlugin = {
    id: pluginId,
    manifest,
    runtime,
    path: pluginPath,
  };
  
  plugins.set(pluginId, plugin);
  return plugin;
}

/**
 * Unload a plugin
 */
export async function unloadPlugin(pluginId: string): Promise<void> {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    throw new Error(`Plugin not found: ${pluginId}`);
  }
  
  await plugin.runtime.dispose();
  plugins.delete(pluginId);
}

/**
 * Get all loaded plugins
 */
export function listPlugins(): LoadedPlugin[] {
  return Array.from(plugins.values());
}

/**
 * Get a plugin by ID
 */
export function getPlugin(pluginId: string): LoadedPlugin | undefined {
  return plugins.get(pluginId);
}

