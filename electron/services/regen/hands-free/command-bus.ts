/**
 * Command Bus for Hands-Free Mode
 * Sends browser commands via WebSocket/SSE to Electron
 */

import { createLogger } from '../../utils/logger';

const log = createLogger('regen-command-bus');

export interface BrowserCommand {
  type:
    | 'OPEN_TAB'
    | 'SCROLL'
    | 'GO_BACK'
    | 'GO_FORWARD'
    | 'CLICK_ELEMENT'
    | 'CLOSE_TAB'
    | 'SWITCH_TAB'
    | 'RELOAD'
    | 'GET_DOM';
  payload: Record<string, unknown>;
  sessionId?: string;
}

// Store WebSocket/SSE connections per session
const commandListeners = new Map<string, Set<(cmd: BrowserCommand) => void>>();

/**
 * Register command listener for a session
 */
export function registerCommandListener(
  sessionId: string,
  listener: (cmd: BrowserCommand) => void
): () => void {
  if (!commandListeners.has(sessionId)) {
    commandListeners.set(sessionId, new Set());
  }

  commandListeners.get(sessionId)!.add(listener);

  log.info('Command listener registered', { sessionId });

  // Return unsubscribe function
  return () => {
    const listeners = commandListeners.get(sessionId);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        commandListeners.delete(sessionId);
      }
    }
  };
}

/**
 * Send command to browser
 */
export function sendCommand(sessionId: string, command: BrowserCommand): void {
  const listeners = commandListeners.get(sessionId);
  if (listeners) {
    log.info('Sending command', { sessionId, type: command.type });
    listeners.forEach(listener => {
      try {
        listener(command);
      } catch (error) {
        log.error('Command listener error', { sessionId, error: String(error) });
      }
    });
  } else {
    log.warn('No listeners for session', { sessionId });
  }
}

/**
 * Broadcast command to all sessions (for global actions)
 */
export function broadcastCommand(command: BrowserCommand): void {
  commandListeners.forEach((listeners, sessionId) => {
    sendCommand(sessionId, command);
  });
}
