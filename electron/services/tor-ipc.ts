/**
 * Tor IPC Handlers
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { initializeTor, getTorService } from './tor';

const TorStartRequest = z.object({
  port: z.number().min(1).max(65535).optional().default(9050),
  controlPort: z.number().min(1).max(65535).optional().default(9051),
  newnymInterval: z.number().min(1).optional(),
});

const TorStatusResponse = z.object({
  running: z.boolean(),
  bootstrapped: z.boolean(),
  progress: z.number(),
  error: z.string().optional(),
  circuitEstablished: z.boolean(),
});

export function registerTorIpc() {
  // Start Tor
  registerHandler('tor:start', TorStartRequest, async (_event, request) => {
    try {
      const torService = initializeTor({
        enabled: true,
        port: request.port || 9050,
        controlPort: request.controlPort || 9051,
        dataDir: '',
        newnymInterval: request.newnymInterval,
      });
      await torService.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Stop Tor
  registerHandler('tor:stop', z.object({}), async () => {
    try {
      const torService = getTorService();
      await torService.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get Tor status
  registerHandler('tor:status', z.object({}), async () => {
    try {
      const torService = getTorService();
      const status = torService.getStatus();
      return status as z.infer<typeof TorStatusResponse>;
    } catch {
      return {
        running: false,
        bootstrapped: false,
        progress: 0,
        circuitEstablished: false,
      } as z.infer<typeof TorStatusResponse>;
    }
  });

  // Request new identity
  registerHandler('tor:newIdentity', z.object({}), async () => {
    try {
      const torService = getTorService();
      await torService.newIdentity();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get proxy string
  registerHandler('tor:getProxy', z.object({}), async () => {
    try {
      const torService = getTorService();
      return { proxy: torService.getProxyString() };
    } catch {
      return { proxy: null };
    }
  });
}

