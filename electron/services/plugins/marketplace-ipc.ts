/**
 * Plugin Marketplace IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getPluginMarketplace } from './marketplace';

export function registerPluginMarketplaceIpc(): void {
  registerHandler('plugin-marketplace:list', z.object({}), async () => {
    const marketplace = getPluginMarketplace();
    const plugins = await marketplace.listAvailable();
    return { plugins };
  });

  registerHandler('plugin-marketplace:install', z.object({
    pluginId: z.string(),
    verifySignature: z.boolean().default(true),
  }), async (_event, request) => {
    const marketplace = getPluginMarketplace();
    await marketplace.install(request.pluginId, request.verifySignature);
    return { success: true };
  });

  registerHandler('plugin-marketplace:uninstall', z.object({
    pluginId: z.string(),
  }), async (_event, request) => {
    const marketplace = getPluginMarketplace();
    await marketplace.uninstall(request.pluginId);
    return { success: true };
  });

  registerHandler('plugin-marketplace:installed', z.object({}), async () => {
    const marketplace = getPluginMarketplace();
    return { plugins: marketplace.getInstalled() };
  });

  registerHandler('plugin-marketplace:isInstalled', z.object({
    pluginId: z.string(),
  }), async (_event, request) => {
    const marketplace = getPluginMarketplace();
    return { installed: marketplace.isInstalled(request.pluginId) };
  });
}

