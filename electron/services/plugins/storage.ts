/**
 * Scoped Storage for Plugins
 * Isolated storage per plugin
 */

import { app } from 'electron';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const pluginStorageDir = join(app.getPath('userData'), 'plugin-storage');

/**
 * Get storage directory for a plugin
 */
function getPluginStorageDir(pluginId: string): string {
  const dir = join(pluginStorageDir, pluginId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get storage file path for a key
 */
function getStoragePath(pluginId: string, key: string): string {
  // Sanitize key to prevent path traversal
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(getPluginStorageDir(pluginId), `${sanitizedKey}.json`);
}

/**
 * Get value from plugin storage
 */
export async function getPluginStorage<T>(pluginId: string, key: string): Promise<T | undefined> {
  const path = getStoragePath(pluginId, key);
  if (!existsSync(path)) {
    return undefined;
  }
  
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[PluginStorage] Error reading ${key} for plugin ${pluginId}:`, error);
    return undefined;
  }
}

/**
 * Set value in plugin storage
 */
export async function setPluginStorage<T>(pluginId: string, key: string, value: T): Promise<void> {
  const path = getStoragePath(pluginId, key);
  try {
    writeFileSync(path, JSON.stringify(value), 'utf-8');
  } catch (error) {
    console.error(`[PluginStorage] Error writing ${key} for plugin ${pluginId}:`, error);
    throw error;
  }
}

/**
 * Delete a key from plugin storage
 */
export async function deletePluginStorage(pluginId: string, key: string): Promise<void> {
  const path = getStoragePath(pluginId, key);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

/**
 * Clear all storage for a plugin
 */
export async function clearPluginStorage(pluginId: string): Promise<void> {
  const dir = getPluginStorageDir(pluginId);
  if (existsSync(dir)) {
    const files = readdirSync(dir);
    for (const file of files) {
      unlinkSync(join(dir, file));
    }
  }
}

/**
 * List all keys for a plugin
 */
export async function listPluginStorageKeys(pluginId: string): Promise<string[]> {
  const dir = getPluginStorageDir(pluginId);
  if (!existsSync(dir)) {
    return [];
  }
  
  const files = readdirSync(dir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => f.slice(0, -5)); // Remove .json extension
}

