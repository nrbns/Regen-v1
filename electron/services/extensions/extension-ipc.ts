/**
 * Extension Management IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getChromeExtensionAdapter } from './chrome-api-adapter';

export function registerExtensionIpc() {
  registerHandler('extensions:load', z.object({ path: z.string() }), async (_event, request) => {
    try {
      const adapter = getChromeExtensionAdapter();
      const extension = await adapter.loadExtension(request.path);
      return {
        success: true,
        extension: {
          id: extension.id,
          name: extension.manifest.name,
          version: extension.manifest.version,
          enabled: extension.enabled,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  registerHandler('extensions:unload', z.object({ id: z.string() }), async (_event, request) => {
    try {
      const adapter = getChromeExtensionAdapter();
      adapter.unloadExtension(request.id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  registerHandler('extensions:list', z.object({}), async () => {
    const adapter = getChromeExtensionAdapter();
    const extensions = adapter.listExtensions();
    return {
      extensions: extensions.map(ext => ({
        id: ext.id,
        name: ext.manifest.name,
        version: ext.manifest.version,
        description: ext.manifest.description,
        enabled: ext.enabled,
        path: ext.path,
      })),
    };
  });

  registerHandler('extensions:get', z.object({ id: z.string() }), async (_event, request) => {
    const adapter = getChromeExtensionAdapter();
    const extension = adapter.getExtension(request.id);
    if (!extension) {
      return { success: false, error: 'Extension not found' };
    }
    return {
      success: true,
      extension: {
        id: extension.id,
        name: extension.manifest.name,
        version: extension.manifest.version,
        description: extension.manifest.description,
        permissions: extension.manifest.permissions || [],
        enabled: extension.enabled,
      },
    };
  });
}
