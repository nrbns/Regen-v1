/**
 * DNS-over-HTTPS IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { enableDoH, disableDoH, isDoHEnabled, getDoHProvider } from './dns';

export function registerDnsIpc(): void {
  registerHandler('dns:enableDoH', z.object({
    provider: z.enum(['cloudflare', 'quad9']).optional().default('cloudflare'),
  }), async (_event, request) => {
    await enableDoH(request.provider);
    return { success: true };
  });

  registerHandler('dns:disableDoH', z.object({}), async () => {
    disableDoH();
    return { success: true };
  });

  registerHandler('dns:status', z.object({}), async () => {
    return {
      enabled: isDoHEnabled(),
      provider: getDoHProvider(),
    };
  });
}

