/**
 * Regen Session Management
 * Tracks language preferences and conversation history
 */

import { createLogger } from '../utils/logger';
import type { LanguageCode } from './language/detector';

const log = createLogger('regen-session');

export interface RegenSession {
  sessionId: string;
  preferredLanguage: LanguageCode;
  lastUserLanguage: LanguageCode;
  mode: 'research' | 'trade' | 'browser' | 'automation';
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
    language: LanguageCode;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

const sessions = new Map<string, RegenSession>();

/**
 * Get or create session
 */
export function getSession(sessionId: string): RegenSession {
  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      sessionId,
      preferredLanguage: 'en',
      lastUserLanguage: 'en',
      mode: 'research',
      history: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessions.set(sessionId, session);
    log.info('Created new session', { sessionId });
  }

  return session;
}

/**
 * Update session language
 */
export function updateSessionLanguage(sessionId: string, detectedLanguage: LanguageCode): void {
  const session = getSession(sessionId);
  session.lastUserLanguage = detectedLanguage;

  // Set preferred language on first detection
  if (session.preferredLanguage === 'en' && detectedLanguage !== 'en') {
    session.preferredLanguage = detectedLanguage;
    log.info('Set preferred language', { sessionId, language: detectedLanguage });
  }

  session.updatedAt = Date.now();
}

/**
 * Add message to session history
 */
export function addMessageToSession(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  language: LanguageCode
): void {
  const session = getSession(sessionId);
  session.history.push({
    role,
    content,
    language,
    timestamp: Date.now(),
  });

  // Keep only last 50 messages
  if (session.history.length > 50) {
    session.history = session.history.slice(-50);
  }

  session.updatedAt = Date.now();
}

/**
 * Update session mode
 */
export function updateSessionMode(sessionId: string, mode: RegenSession['mode']): void {
  const session = getSession(sessionId);
  session.mode = mode;
  session.updatedAt = Date.now();
}

/**
 * Get session language for response
 */
export function getResponseLanguage(sessionId: string): LanguageCode {
  const session = getSession(sessionId);
  return session.lastUserLanguage || session.preferredLanguage || 'en';
}
