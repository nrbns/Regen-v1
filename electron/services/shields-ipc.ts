/**
 * Shields IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getShieldsService } from './shields';

const ShieldsConfigSchema = z.object({
  ads: z.boolean(),
  cookies: z.enum(['all', '3p', 'none']),
  httpsOnly: z.boolean(),
  fingerprinting: z.boolean(),
  scripts: z.enum(['all', '3p', 'none']),
  webrtc: z.boolean(),
});

const SetSiteShieldsRequest = z.object({
  hostname: z.string(),
  config: ShieldsConfigSchema.partial(),
});

export function registerShieldsIpc() {
  // Get shields for URL
  registerHandler('shields:get', z.object({ url: z.string() }), async (_event, request) => {
    const shieldsService = getShieldsService();
    const shields = shieldsService.getShieldsForUrl(request.url);
    return {
      hostname: shields.hostname,
      config: shields.config,
      overrides: shields.overrides,
    };
  });

  // Set site shields
  registerHandler('shields:set', SetSiteShieldsRequest, async (_event, request) => {
    const shieldsService = getShieldsService();
    shieldsService.setSiteShields(request.hostname, request.config);
    return { success: true };
  });

  // Update default config
  registerHandler('shields:updateDefault', ShieldsConfigSchema.partial(), async (_event, request) => {
    const shieldsService = getShieldsService();
    shieldsService.updateDefaultConfig(request);
    return { success: true };
  });

  // Get all site configs
  registerHandler('shields:list', z.object({}), async () => {
    const shieldsService = getShieldsService();
    return shieldsService.getAllSiteConfigs();
  });
}

