/**
 * Custom Protocol Handlers
 * Handles ob:// and obx:// protocols for internal pages and plugin surfaces
 */

import { protocol, ProtocolRequest, ProtocolResponse } from 'electron';
import { app } from 'electron';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';

/**
 * Register custom protocols
 */
export function registerProtocols(): void {
  // ob:// protocol for internal pages
  protocol.registerFileProtocol('ob', (request, callback) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Route internal pages
    if (pathname.startsWith('/settings')) {
      // Serve settings page
      const filePath = path.join(__dirname, '../renderer/settings.html');
      callback({ path: filePath });
      return;
    }
    
    if (pathname.startsWith('/plugin-manager')) {
      // Serve plugin manager page
      const filePath = path.join(__dirname, '../renderer/plugin-manager.html');
      callback({ path: filePath });
      return;
    }
    
    if (pathname.startsWith('/mode/')) {
      // Serve mode pages
      const mode = pathname.split('/')[2];
      const filePath = path.join(__dirname, `../renderer/modes/${mode}/index.html`);
      callback({ path: filePath });
      return;
    }
    
    // Default: 404
    callback({ error: -6 }); // FILE_NOT_FOUND
  });
  
  // obx:// protocol for plugin surfaces (sandboxed)
  protocol.registerFileProtocol('obx', (request, callback) => {
    const url = new URL(request.url);
    const pluginId = url.hostname;
    
    // Validate plugin ID format
    if (!pluginId.match(/^[a-z0-9-]+$/)) {
      callback({ error: -6 });
      return;
    }
    
    // Serve plugin surface (from plugin directory)
    const pluginPath = path.join(app.getPath('userData'), 'plugins', pluginId, 'surface.html');
    callback({ path: pluginPath });
  });
  
  // Register secure CSP headers
  protocol.registerHttpProtocol('ob', (request, callback) => {
    // For HTTP requests, add security headers
    callback({
      url: request.url,
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      },
    });
  });
}

/**
 * Register protocol schemes (MUST be called before app.ready())
 */
export function registerProtocolSchemes(): void {
  if (app.isReady()) {
    console.warn('[Protocol] registerProtocolSchemes should be called before app.ready()');
    return;
  }
  
  // Register custom schemes as privileged (required for security)
  protocol.registerSchemesAsPrivileged([
    { scheme: 'ob', privileges: { secure: true, standard: true, supportFetchAPI: true } },
    { scheme: 'obx', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: false } },
  ]);
}

/**
 * Initialize protocols (call registerProtocolSchemes first, before app.ready())
 */
export function initProtocols(): void {
  // Handle protocol registration when app is ready
  app.whenReady().then(() => {
    if (!protocol.isProtocolRegistered('ob')) {
      registerProtocols();
    }
  });
}

