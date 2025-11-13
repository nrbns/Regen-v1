/**
 * Tor IPC Handlers
 */

import { BrowserWindow } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { initializeTor, getTorService, type TorStatus } from './tor';
import { createLogger } from './utils/logger';
import { session } from 'electron';

const TorStartRequest = z.object({
  port: z.number().min(1).max(65535).optional().default(9050),
  controlPort: z.number().min(1).max(65535).optional().default(9051),
  newnymInterval: z.number().min(1).optional(),
});

const torStatusResponseSchema = z.object({
  running: z.boolean(),
  bootstrapped: z.boolean(),
  progress: z.number(),
  error: z.string().optional(),
  circuitEstablished: z.boolean(),
  stub: z.boolean().optional(),
});

const logger = createLogger('tor-ipc');

let useStub = false;
const stubStatus: TorStatus & { stub?: boolean } = {
  running: false,
  bootstrapped: false,
  progress: 0,
  circuitEstablished: false,
  stub: true,
  error: 'Tor unavailable; running in stub mode',
};

let torProxyApplied = false;
let previousProxyString: string | null = null;

async function applyTorProxy(proxyRules: string) {
  try {
    if (!torProxyApplied) {
      // Capture existing proxy for later restoration
      const current = await session.defaultSession.resolveProxy('https://example.com');
      previousProxyString = current;
    }
    await session.defaultSession.setProxy({ proxyRules } as any);
    torProxyApplied = true;
    logger.info('Applied Tor proxy to default session', { proxyRules });
  } catch (error) {
    logger.error('Failed to apply Tor proxy', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function clearTorProxy() {
  if (!torProxyApplied) {
    return;
  }
  try {
    if (previousProxyString && previousProxyString !== 'DIRECT') {
      await session.defaultSession.setProxy({ proxyRules: previousProxyString } as any);
    } else {
      await session.defaultSession.setProxy({ mode: 'direct' } as any);
    }
    logger.info('Restored previous proxy configuration', { previous: previousProxyString });
  } catch (error) {
    logger.warn('Failed to restore proxy after Tor stop', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    torProxyApplied = false;
    previousProxyString = null;
  }
}

export function registerTorIpc() {
  const broadcastStatus = (status: TorStatus & { stub?: boolean }) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('net:status', {
        tor: {
          enabled: status.running,
          circuitEstablished: status.circuitEstablished,
          bootstrapped: status.bootstrapped,
          progress: status.progress,
          error: status.error,
          stub: status.stub,
        },
      });
    });
  };

  // Start Tor
  registerHandler('tor:start', TorStartRequest, async (_event, request) => {
    try {
      if (useStub) {
        stubStatus.running = true;
        stubStatus.bootstrapped = false;
        stubStatus.progress = 0;
        broadcastStatus(stubStatus);
        return { success: true, stub: true };
      }

      const torService = initializeTor({
        enabled: true,
        port: request.port || 9050,
        controlPort: request.controlPort || 9051,
        dataDir: process.env.OB_TOR_DATA_DIR || 'tor',
        newnymInterval: request.newnymInterval,
      });
      torService.on('status', (status) => broadcastStatus({ ...status }));
      torService.on('ready', () => {
        const status = torService.getStatus();
        broadcastStatus({ ...status });
      });
      await torService.start();
      await applyTorProxy(torService.getProxyString());
      broadcastStatus({ ...torService.getStatus() });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Tor start failed; enabling stub', { error: message });
      useStub = true;
      stubStatus.running = false;
      stubStatus.error = message;
      broadcastStatus(stubStatus);
      return { success: true, stub: true, warning: message };
    }
  });

  // Stop Tor
  registerHandler('tor:stop', z.object({}), async () => {
    try {
      if (useStub) {
        stubStatus.running = false;
        stubStatus.bootstrapped = false;
        stubStatus.progress = 0;
        broadcastStatus(stubStatus);
        return { success: true, stub: true };
      }

      const torService = getTorService();
      await torService.stop();
      await clearTorProxy();
      broadcastStatus({ ...torService.getStatus() });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Tor stop failed', { error: message });
      return { success: false, error: message };
    }
  });

  // Get Tor status
  registerHandler('tor:status', z.object({}), async () => {
    try {
      if (useStub) {
        const parsed = torStatusResponseSchema.parse(stubStatus);
        broadcastStatus(parsed);
        return parsed;
      }

      const torService = getTorService();
      const status = torService.getStatus();
      const parsed = torStatusResponseSchema.parse(status);
      broadcastStatus(parsed);
      return parsed;
    } catch {
      logger.warn('Tor status fetch failed; returning stub');
      useStub = true;
      const parsed = torStatusResponseSchema.parse(stubStatus);
      broadcastStatus(parsed);
      return parsed;
    }
  });

  // Request new identity
  registerHandler('tor:newIdentity', z.object({}), async () => {
    try {
      if (useStub) {
        broadcastStatus(stubStatus);
        return { success: true, stub: true };
      }

      const torService = getTorService();
      await torService.newIdentity();
      broadcastStatus({ ...torService.getStatus() });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn('Tor new identity failed', { error: message });
      return { success: false, error: message };
    }
  });

  // Get proxy string
  registerHandler('tor:getProxy', z.object({}), async () => {
    try {
      if (useStub) {
        return { proxy: null, stub: true };
      }

      const torService = getTorService();
      return { proxy: torService.getProxyString() };
    } catch {
      logger.warn('Tor proxy fetch failed; returning stub');
      useStub = true;
      return { proxy: null, stub: true };
    }
  });

  if (useStub) {
    broadcastStatus(stubStatus);
  }
}

