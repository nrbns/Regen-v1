/**
 * Hands-Free Mode State Machine
 * Manages session state for hands-free browsing
 */

import { createLogger } from '../../utils/logger';

const log = createLogger('regen-hands-free');

export type HandsFreeState = 'IDLE' | 'LISTENING' | 'EXECUTING' | 'CONFIRMING' | 'READING';

interface SessionState {
  sessionId: string;
  state: HandsFreeState;
  currentAction?: string;
  interrupted: boolean;
  lastCommand?: string;
}

const sessions = new Map<string, SessionState>();

/**
 * Get or create session state
 */
export function getSessionState(sessionId: string): SessionState {
  let state = sessions.get(sessionId);

  if (!state) {
    state = {
      sessionId,
      state: 'IDLE',
      interrupted: false,
    };
    sessions.set(sessionId, state);
  }

  return state;
}

/**
 * Update session state
 */
export function setSessionState(
  sessionId: string,
  newState: HandsFreeState,
  action?: string
): void {
  const state = getSessionState(sessionId);
  const oldState = state.state;

  state.state = newState;
  state.currentAction = action;
  state.interrupted = false;

  log.info('State transition', { sessionId, from: oldState, to: newState, action });
}

/**
 * Interrupt current action
 */
export function interruptSession(sessionId: string): void {
  const state = getSessionState(sessionId);
  state.interrupted = true;
  state.state = 'IDLE';
  state.currentAction = undefined;

  log.info('Session interrupted', { sessionId });
}

/**
 * Check if session is interrupted
 */
export function isInterrupted(sessionId: string): boolean {
  const state = getSessionState(sessionId);
  return state.interrupted;
}

/**
 * Get current state
 */
export function getCurrentState(sessionId: string): HandsFreeState {
  const state = getSessionState(sessionId);
  return state.state;
}
