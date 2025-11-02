/**
 * Network Controls IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getNetworkControlsService } from './network-controls';

const NetworkControlsResponse = z.object({
  quicEnabled: z.boolean(),
  ipv6Enabled: z.boolean(),
  ipv6LeakProtection: z.boolean(),
});

export function registerNetworkControlsIpc() {
  // Get network controls config
  registerHandler('network:get', z.object({}), async () => {
    const service = getNetworkControlsService();
    const config = service.getConfig();
    return config as z.infer<typeof NetworkControlsResponse>;
  });

  // Disable QUIC
  registerHandler('network:disableQUIC', z.object({}), async () => {
    const service = getNetworkControlsService();
    service.disableQUIC();
    return { success: true };
  });

  // Enable QUIC
  registerHandler('network:enableQUIC', z.object({}), async () => {
    const service = getNetworkControlsService();
    service.enableQUIC();
    return { success: true };
  });

  // Disable IPv6 (leak protection)
  registerHandler('network:disableIPv6', z.object({}), async () => {
    const service = getNetworkControlsService();
    service.disableIPv6();
    return { success: true };
  });

  // Enable IPv6
  registerHandler('network:enableIPv6', z.object({}), async () => {
    const service = getNetworkControlsService();
    service.enableIPv6();
    return { success: true };
  });
}

