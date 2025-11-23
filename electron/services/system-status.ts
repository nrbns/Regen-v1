/**
 * System Status Service
 * Provides real-time health monitoring for all system components
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getTorService } from './tor';
import { getVPNService } from './vpn';
import { createLogger } from './utils/logger';

const log = createLogger('system-status');

export interface SystemStatus {
  redisConnected: boolean;
  redixAvailable: boolean;
  workerState: 'running' | 'stopped' | 'error';
  vpn: {
    connected: boolean;
    profile?: string;
    type?: string;
  };
  tor: {
    running: boolean;
    bootstrapped: boolean;
  };
  mode: 'research' | 'trade' | 'game' | 'normal';
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

let startTime = Date.now();
let lastStatus: SystemStatus | null = null;

/**
 * Check Redis connection status
 */
async function checkRedisConnection(): Promise<boolean> {
  try {
    // Dynamically import Redis client to avoid type issues
    // @ts-ignore - Redis config is JS file
    const { redisClient } = await import('../../server/config/redis.js');
    await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get worker state
 * Checks if BullMQ workers are active by attempting to check workflow orchestrator
 */
async function getWorkerState(): Promise<'running' | 'stopped' | 'error'> {
  try {
    // Check if Redix is enabled
    const redixAvailable = process.env.REDIX_ENABLED !== 'false';
    if (!redixAvailable) {
      return 'stopped';
    }

    // Try to check if workflow orchestrator has active workers
    // This is a best-effort check - workers may exist but not be registered here
    try {
      // @ts-ignore - workflow-orchestrator is JS file
      const { hasActiveWorkers } = await import(
        '../../server/services/redix/workflow-orchestrator.js'
      );
      const hasWorkers = hasActiveWorkers?.() || false;
      return hasWorkers ? 'running' : 'stopped';
    } catch {
      // If orchestrator not available, assume running if Redix is enabled
      return 'running';
    }
  } catch {
    return 'error';
  }
}

/**
 * Get Tor status
 */
async function getTorStatus(): Promise<{ running: boolean; bootstrapped: boolean }> {
  try {
    const torService = getTorService();
    const status = torService.getStatus();
    return {
      running: status.running,
      bootstrapped: status.bootstrapped,
    };
  } catch {
    // Tor service not initialized
    return {
      running: false,
      bootstrapped: false,
    };
  }
}

/**
 * Get VPN status
 */
async function getVPNStatus(): Promise<{
  connected: boolean;
  profile?: string;
  type?: string;
}> {
  try {
    const vpnService = getVPNService();
    const status = vpnService.getStatus();
    return {
      connected: status.connected,
      profile: status.name,
      type: status.type,
    };
  } catch {
    return {
      connected: false,
    };
  }
}

/**
 * Get current mode
 * Maps app mode to system status mode
 */
function getCurrentMode(): 'research' | 'trade' | 'game' | 'normal' {
  // Note: This runs in the main process, so we can't directly access renderer state
  // In a real implementation, we'd either:
  // 1. Store mode in main process state (IPC from renderer)
  // 2. Query renderer via IPC
  // 3. Use a shared store accessible from both processes

  // For now, check if we can get mode from environment or default to normal
  const modeFromEnv = process.env.OMNI_MODE;
  if (modeFromEnv === 'research' || modeFromEnv === 'trade' || modeFromEnv === 'game') {
    return modeFromEnv;
  }

  // Default to normal
  return 'normal';
}

/**
 * Get system status
 */
async function getSystemStatus(): Promise<SystemStatus> {
  // Check Redis
  const redisConnected = await checkRedisConnection();

  // Check Redix
  const redixAvailable = process.env.REDIX_ENABLED !== 'false';

  // Get worker state
  const workerState = await getWorkerState();

  // Get VPN/Tor status
  const vpn = await getVPNStatus();
  const tor = await getTorStatus();

  // Get current mode
  const mode = getCurrentMode();

  // Memory usage
  const memUsage = process.memoryUsage();

  return {
    redisConnected,
    redixAvailable,
    workerState,
    vpn,
    tor,
    mode,
    uptime: Date.now() - startTime,
    memoryUsage: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    },
  };
}

/**
 * Log state changes
 */
function logStateChanges(current: SystemStatus): void {
  if (!lastStatus) {
    lastStatus = current;
    return;
  }

  // Detect changes
  if (lastStatus.redisConnected !== current.redisConnected) {
    log.warn(
      `[SystemStatus] Redis connection changed: ${current.redisConnected ? 'connected' : 'disconnected'}`
    );
  }

  if (lastStatus.workerState !== current.workerState) {
    log.warn(
      `[SystemStatus] Worker state changed: ${lastStatus.workerState} → ${current.workerState}`
    );
  }

  if (lastStatus.redixAvailable !== current.redixAvailable) {
    log.warn(
      `[SystemStatus] Redix availability changed: ${current.redixAvailable ? 'available' : 'unavailable'}`
    );
  }

  if (lastStatus.vpn.connected !== current.vpn.connected) {
    log.info(
      `[SystemStatus] VPN connection changed: ${current.vpn.connected ? 'connected' : 'disconnected'}`
    );
  }

  if (lastStatus.tor.running !== current.tor.running) {
    log.info(`[SystemStatus] Tor state changed: ${current.tor.running ? 'running' : 'stopped'}`);
  }

  lastStatus = current;
}

/**
 * Register IPC handlers
 */
export function registerSystemStatusIpc(): void {
  registerHandler('system:getStatus', z.object({}), async (): Promise<SystemStatus> => {
    const status = await getSystemStatus();
    logStateChanges(status);
    return status;
  });

  // Start periodic state change monitoring
  setInterval(async () => {
    try {
      const current = await getSystemStatus();
      logStateChanges(current);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('[SystemStatus] Failed to check status', { error: err.message, stack: err.stack });
    }
  }, 10000); // Check every 10 seconds
}
