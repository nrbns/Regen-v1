/**
 * VPN IPC Handlers
 */

import { BrowserWindow } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getVPNService } from './vpn';

const vpnStatusResponseSchema = z.object({
  connected: z.boolean(),
  type: z.enum(['wireguard', 'openvpn', 'ikev2', 'other']).optional(),
  name: z.string().optional(),
  interface: z.string().optional(),
  server: z.string().optional(),
});

export function registerVPNIpc() {
  const vpnService = getVPNService();
  const broadcast = (status: Awaited<ReturnType<typeof vpnService.checkStatus>>) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('net:status', {
        vpn: {
          enabled: status.connected,
          connected: status.connected,
          provider: status.name ?? status.type,
          interface: status.interface,
          server: status.server,
        },
      });
    });
  };

  vpnService.on('status', (status) => broadcast(status));

  // Get VPN status
  registerHandler('vpn:status', z.object({}), async () => {
    const status = await vpnService.checkStatus();
    const parsed = vpnStatusResponseSchema.parse(status);
    broadcast(parsed);
    return parsed;
  });

  // Check VPN (force refresh)
  registerHandler('vpn:check', z.object({}), async () => {
    const status = await vpnService.checkStatus(true);
    const parsed = vpnStatusResponseSchema.parse(status);
    broadcast(parsed);
    return parsed;
  });

  registerHandler('vpn:listProfiles', z.object({}), async () => {
    const profiles = vpnService.listProfiles();
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      type: profile.type ?? 'other',
      server: profile.server,
    }));
  });

  registerHandler(
    'vpn:connect',
    z.object({ id: z.string().min(1) }),
    async (_event, request) => {
      const status = await vpnService.connectProfile(request.id);
      const parsed = vpnStatusResponseSchema.parse(status);
      broadcast(parsed);
      return parsed;
    },
  );

  registerHandler('vpn:disconnect', z.object({}), async () => {
    const status = await vpnService.disconnectProfile();
    const parsed = vpnStatusResponseSchema.parse(status);
    broadcast(parsed);
    return parsed;
  });
}

