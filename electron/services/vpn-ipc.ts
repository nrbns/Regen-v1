/**
 * VPN IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getVPNService } from './vpn';

const VPNStatusResponse = z.object({
  connected: z.boolean(),
  type: z.enum(['wireguard', 'openvpn', 'ikev2', 'other']).optional(),
  name: z.string().optional(),
  interface: z.string().optional(),
  server: z.string().optional(),
});

export function registerVPNIpc() {
  // Get VPN status
  registerHandler('vpn:status', z.object({}), async () => {
    const vpnService = getVPNService();
    const status = await vpnService.checkStatus();
    return status as z.infer<typeof VPNStatusResponse>;
  });

  // Check VPN (force refresh)
  registerHandler('vpn:check', z.object({}), async () => {
    const vpnService = getVPNService();
    return await vpnService.checkStatus();
  });
}

