/**
 * Agent Service Manager
 *
 * Manages the L2 agent service lifecycle:
 * - Spawns Node.js agent service when L2 is activated
 * - Kills agent service when L2 is deactivated
 * - Communicates via IPC/HTTP with the service
 *
 * NOTE: Requires Tauri commands:
 * - 'spawn_process': { command: string, args: string[], cwd?: string } => { pid: number, port?: number }
 * - 'kill_process': { pid: number } => void
 *
 * These should be implemented in src-tauri/src/commands.rs
 */

import { isTauriRuntime } from '../../lib/env';

let agentServiceProcess: any = null;
let agentServicePort: number | null = null;
let agentServiceHealthCheck: NodeJS.Timeout | null = null;

const DEFAULT_AGENT_PORT = 4000;
const AGENT_SERVICE_PATH = 'server/redix-server.js'; // Path to agent service entry point

/**
 * Spawn agent service (Node.js backend)
 */
export async function spawnAgentService(): Promise<void> {
  if (agentServiceProcess) {
    console.log('[AgentService] Already running');
    return;
  }

  if (!isTauriRuntime()) {
    // In web mode, agent service should be started separately
    // Just verify it's accessible
    console.log('[AgentService] Web mode - assuming agent service runs separately');
    agentServicePort = DEFAULT_AGENT_PORT;
    startHealthCheck();
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');

    // Spawn agent service process via Tauri
    const result = (await invoke('spawn_process', {
      command: 'node',
      args: [AGENT_SERVICE_PATH],
      cwd: process.cwd(),
    })) as { pid: number; port: number };

    agentServiceProcess = { pid: result.pid };
    agentServicePort = result.port || DEFAULT_AGENT_PORT;

    console.log(`[AgentService] Spawned (PID: ${result.pid}, Port: ${agentServicePort})`);

    // Start health check
    startHealthCheck();

    // Wait for service to be ready (max 10s)
    await waitForServiceReady(10000);
  } catch (error) {
    console.error('[AgentService] Failed to spawn:', error);
    throw error;
  }
}

/**
 * Kill agent service
 */
export async function killAgentService(): Promise<void> {
  if (!agentServiceProcess) {
    return;
  }

  try {
    if (isTauriRuntime()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('kill_process', { pid: agentServiceProcess.pid });
    } else {
      // In web mode, we can't kill external processes
      console.log('[AgentService] Web mode - cannot kill external process');
    }

    stopHealthCheck();
    agentServiceProcess = null;
    agentServicePort = null;

    console.log('[AgentService] Killed');
  } catch (error) {
    console.error('[AgentService] Failed to kill:', error);
    // Don't throw - cleanup state anyway
    agentServiceProcess = null;
    agentServicePort = null;
  }
}

/**
 * Check if agent service is running
 */
export function isAgentServiceRunning(): boolean {
  return agentServiceProcess !== null;
}

/**
 * Get agent service URL
 */
export function getAgentServiceUrl(): string {
  const port = agentServicePort || DEFAULT_AGENT_PORT;
  return `http://localhost:${port}`;
}

/**
 * Wait for service to be ready
 */
async function waitForServiceReady(timeout: number): Promise<void> {
  const start = Date.now();
  const url = getAgentServiceUrl();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (response.ok) {
        console.log('[AgentService] Ready');
        return;
      }
    } catch {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('Agent service failed to start within timeout');
}

/**
 * Start health check for agent service
 */
function startHealthCheck(): void {
  if (agentServiceHealthCheck) {
    return;
  }

  agentServiceHealthCheck = setInterval(async () => {
    if (!agentServiceProcess || !agentServicePort) {
      return;
    }

    try {
      const response = await fetch(`${getAgentServiceUrl()}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        console.warn('[AgentService] Health check failed - service may be down');
      }
    } catch (error) {
      console.warn('[AgentService] Health check error:', error);
      // Don't kill service on health check failure - it might be temporary
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Stop health check
 */
function stopHealthCheck(): void {
  if (agentServiceHealthCheck) {
    clearInterval(agentServiceHealthCheck);
    agentServiceHealthCheck = null;
  }
}
