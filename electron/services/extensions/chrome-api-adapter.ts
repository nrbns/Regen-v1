/**
 * Chrome Extension API Adapter
 * Provides Chrome Extension Manifest V3 API compatibility
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { WebContents } from 'electron';

export interface ExtensionManifest {
  manifest_version: 2 | 3;
  name: string;
  version: string;
  description?: string;
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: ContentScript[];
  background?: {
    service_worker?: string;
    scripts?: string[];
  };
  action?: {
    default_popup?: string;
    default_icon?: string | Record<string, string>;
  };
  icons?: Record<string, string>;
  web_accessible_resources?: string[];
  storage?: {
    managed_schema?: Record<string, unknown>;
  };
}

export interface ContentScript {
  matches: string[];
  js?: string[];
  css?: string[];
  run_at?: 'document_start' | 'document_end' | 'document_idle';
  all_frames?: boolean;
}

export interface LoadedExtension {
  id: string;
  manifest: ExtensionManifest;
  path: string;
  enabled: boolean;
  loadedAt: number;
}

class ChromeExtensionAdapter {
  private extensions: Map<string, LoadedExtension> = new Map();
  private extensionPaths: Map<string, string> = new Map();
  private contentScripts: Map<string, ContentScript[]> = new Map();

  /**
   * Load extension from directory
   */
  async loadExtension(extensionPath: string): Promise<LoadedExtension> {
    const manifestPath = path.join(extensionPath, 'manifest.json');

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest: ExtensionManifest = JSON.parse(manifestContent);

      // Validate manifest
      this.validateManifest(manifest);

      // Generate extension ID (deterministic hash of path)
      const extensionId = this.generateExtensionId(extensionPath);

      const extension: LoadedExtension = {
        id: extensionId,
        manifest,
        path: extensionPath,
        enabled: true,
        loadedAt: Date.now(),
      };

      this.extensions.set(extensionId, extension);
      this.extensionPaths.set(extensionId, extensionPath);

      // Extract content scripts
      if (manifest.content_scripts) {
        this.contentScripts.set(extensionId, manifest.content_scripts);
      }

      // Load background service worker if present
      if (manifest.background?.service_worker) {
        await this.loadBackgroundWorker(extension);
      }

      console.log(`[ChromeExtension] Loaded extension: ${manifest.name} (${extensionId})`);
      return extension;
    } catch (error) {
      throw new Error(`Failed to load extension from ${extensionPath}: ${error}`);
    }
  }

  /**
   * Unload extension
   */
  unloadExtension(extensionId: string): void {
    this.extensions.delete(extensionId);
    this.extensionPaths.delete(extensionId);
    this.contentScripts.delete(extensionId);
    console.log(`[ChromeExtension] Unloaded extension: ${extensionId}`);
  }

  /**
   * Get loaded extension
   */
  getExtension(extensionId: string): LoadedExtension | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * List all loaded extensions
   */
  listExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Inject content scripts into a web page
   */
  async injectContentScripts(webContents: WebContents, url: string): Promise<void> {
    const urlObj = new URL(url);

    for (const [extensionId, scripts] of this.contentScripts.entries()) {
      const extension = this.extensions.get(extensionId);
      if (!extension || !extension.enabled) continue;

      for (const script of scripts) {
        // Check if URL matches
        const matches = script.matches.some(pattern => this.matchPattern(pattern, urlObj));
        if (!matches) continue;

        // Inject CSS first
        if (script.css) {
          for (const cssFile of script.css) {
            const cssPath = path.join(extension.path, cssFile);
            try {
              const cssContent = await fs.readFile(cssPath, 'utf-8');
              await webContents.insertCSS(cssContent);
            } catch (error) {
              console.warn(`[ChromeExtension] Failed to inject CSS ${cssFile}:`, error);
            }
          }
        }

        // Inject JS
        if (script.js) {
          for (const jsFile of script.js) {
            const jsPath = path.join(extension.path, jsFile);
            try {
              const jsContent = await fs.readFile(jsPath, 'utf-8');

              // Determine injection timing
              const runAt = script.run_at || 'document_idle';

              if (runAt === 'document_start') {
                await webContents.executeJavaScript(jsContent, true);
              } else if (runAt === 'document_end') {
                webContents.once('dom-ready', () => {
                  webContents.executeJavaScript(jsContent, true).catch(console.error);
                });
              } else {
                // document_idle - wait for DOMContentLoaded
                webContents.once('dom-ready', () => {
                  setTimeout(() => {
                    webContents.executeJavaScript(jsContent, true).catch(console.error);
                  }, 0);
                });
              }
            } catch (error) {
              console.warn(`[ChromeExtension] Failed to inject JS ${jsFile}:`, error);
            }
          }
        }
      }
    }
  }

  /**
   * Check if extension has permission
   */
  hasPermission(extensionId: string, permission: string): boolean {
    const extension = this.extensions.get(extensionId);
    if (!extension) return false;

    const permissions = extension.manifest.permissions || [];
    return permissions.includes(permission) || permissions.includes('*');
  }

  /**
   * Validate manifest
   */
  private validateManifest(manifest: ExtensionManifest): void {
    if (!manifest.name || !manifest.version) {
      throw new Error('Manifest must have name and version');
    }

    if (manifest.manifest_version !== 2 && manifest.manifest_version !== 3) {
      throw new Error('Only manifest version 2 and 3 are supported');
    }

    // Validate content scripts
    if (manifest.content_scripts) {
      for (const script of manifest.content_scripts) {
        if (!script.matches || script.matches.length === 0) {
          throw new Error('Content scripts must have matches');
        }
      }
    }
  }

  /**
   * Generate deterministic extension ID
   */
  private generateExtensionId(extensionPath: string): string {
    const { createHash } = require('node:crypto');
    const hash = createHash('sha256').update(extensionPath).digest('hex');
    return hash.substring(0, 32);
  }

  /**
   * Match URL pattern (simplified Chrome extension pattern matching)
   */
  private matchPattern(pattern: string, url: URL): boolean {
    // Convert Chrome pattern to regex
    // Patterns like: *://*.example.com/*, https://*/*
    let regexStr = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '\\?');

    // Handle protocol wildcard
    if (pattern.startsWith('*://')) {
      regexStr = regexStr.replace('.*://', '(https?|wss?):\\/\\/');
    }

    try {
      const regex = new RegExp(`^${regexStr}$`);
      return regex.test(url.href);
    } catch {
      return false;
    }
  }

  /**
   * Load background service worker
   */
  private async loadBackgroundWorker(extension: LoadedExtension): Promise<void> {
    const workerPath = extension.manifest.background?.service_worker;
    if (!workerPath) return;

    const fullPath = path.join(extension.path, workerPath);

    try {
      // In a real implementation, we'd run this in an isolated context
      // For now, we just validate it exists
      await fs.access(fullPath);
      console.log(`[ChromeExtension] Background worker found: ${workerPath}`);

      // TODO: Execute service worker in isolated context
      // This would require creating a BrowserView or WebContents for the worker
    } catch {
      console.warn(`[ChromeExtension] Background worker not found: ${workerPath}`);
    }
  }
}

// Singleton instance
let adapterInstance: ChromeExtensionAdapter | null = null;

export function getChromeExtensionAdapter(): ChromeExtensionAdapter {
  if (!adapterInstance) {
    adapterInstance = new ChromeExtensionAdapter();
  }
  return adapterInstance;
}
