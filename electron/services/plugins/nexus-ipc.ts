import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { listNexusPlugins, publishNexusPlugin, toggleNexusTrust, listNexusPeers } from './extension-nexus';

export function registerExtensionNexusIpc(): void {
  registerHandler(
    'plugins:nexus:list',
    z.object({}),
    async () => {
      const [plugins, peers] = await Promise.all([listNexusPlugins(), listNexusPeers()]);
      return { plugins, peers };
    },
  );

  registerHandler(
    'plugins:nexus:publish',
    z.object({
      pluginId: z.string(),
      name: z.string(),
      version: z.string(),
      description: z.string(),
      author: z.string(),
      sourcePeer: z.string(),
      carbonScore: z.number().min(0).max(100).optional(),
      tags: z.array(z.string()).optional(),
    }),
    async (_event, request) => {
      const entry = await publishNexusPlugin(request);
      return entry;
    },
  );

  registerHandler(
    'plugins:nexus:trust',
    z.object({
      pluginId: z.string(),
      trusted: z.boolean(),
    }),
    async (_event, request) => {
      const entry = await toggleNexusTrust(request.pluginId, request.trusted);
      return { plugin: entry };
    },
  );
}
