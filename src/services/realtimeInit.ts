/**
 * Initialize realtime socket service on app startup
 */

import { getSocketService } from './realtimeSocket';

const SERVER_URL = import.meta.env.VITE_REALTIME_SERVER_URL || 'ws://localhost:3000';

let initialized = false;

/**
 * Initialize realtime service with token
 */
export async function initializeRealtimeService(token: string): Promise<void> {
  if (initialized) {
    console.log('[Realtime] Already initialized');
    return;
  }

  try {
    console.log('[Realtime] Initializing service...');

    const socketService = getSocketService({
      serverUrl: SERVER_URL,
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    await socketService.connect(token);

    initialized = true;
    console.log('[Realtime] Service initialized successfully');
  } catch (error) {
    console.error('[Realtime] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Get initialization status
 */
export function isRealtimeInitialized(): boolean {
  return initialized;
}

/**
 * Disconnect realtime service
 */
export function disconnectRealtimeService(): void {
  try {
    const socketService = getSocketService();
    socketService.disconnect();
    initialized = false;
    console.log('[Realtime] Service disconnected');
  } catch (error) {
    console.error('[Realtime] Failed to disconnect:', error);
  }
}

/**
 * Example: Initialize on user login
 * 
 * ```tsx
 * import { initializeRealtimeService } from './services/realtimeInit';
 * 
 * async function handleLogin(token: string) {
 *   await initializeRealtimeService(token);
 *   // Now realtime features are available
 * }
 * ```
 */
