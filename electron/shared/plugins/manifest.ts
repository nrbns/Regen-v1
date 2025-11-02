/**
 * Plugin Manifest Schema
 * Defines the structure and permissions for plugins
 */

import { z } from 'zod';

export type OBPermission =
  | 'network'           // Make HTTP requests (robots-aware)
  | 'storage:scoped'    // Scoped storage per plugin
  | 'export:csv'        // Export data as CSV
  | 'export:json'       // Export data as JSON
  | 'proxy:select'      // Select proxy per request
  | 'model:local'       // Access local AI model
  | 'clipboard:r'       // Read clipboard
  | 'clipboard:w'       // Write clipboard (restricted)
  | 'fs:read'           // Read filesystem (scoped to plugin dir)
  | 'tabs:read'         // Read tab information
  | 'ui:panel'          // Mount UI panel
  | 'events';           // Subscribe to events

export const PluginManifestSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().max(500),
  author: z.string().optional(),
  permissions: z.array(z.enum([
    'network',
    'storage:scoped',
    'export:csv',
    'export:json',
    'proxy:select',
    'model:local',
    'clipboard:r',
    'clipboard:w',
    'fs:read',
    'tabs:read',
    'ui:panel',
    'events',
  ] as const)),
  entry: z.string(), // Worker script path (relative to plugin root)
  ui: z.object({
    panel: z.string().optional(), // Panel UI script path
    settings: z.string().optional(), // Settings UI script path
  }).optional(),
  settings: z.record(z.unknown()).optional(), // Default settings
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

/**
 * Validate a plugin manifest
 */
export function validateManifest(data: unknown): { success: true; manifest: PluginManifest } | { success: false; error: string } {
  const result = PluginManifestSchema.safeParse(data);
  if (result.success) {
    return { success: true, manifest: result.data };
  }
  return { success: false, error: result.error.message };
}

