/**
 * Regen Core Agent
 * The brain of OmniBrowser - unified handler for all modes
 *
 * Architecture:
 * - Layer 1: Core routing and orchestration
 * - Routes to mode-specific handlers (research/trade/browser/automation)
 * - Manages language detection and session state
 * - Orchestrates tools and generates responses
 */

import { createLogger } from '../utils/logger';
import { handleResearchQuery } from './modes/research';
import { handleTradeQuery } from './modes/trade';
import { handleBrowserNav } from './modes/browser';
import { handleAutomation } from './modes/automation';
import { detectLanguage } from './language/detector';
import {
  getSession,
  updateSessionLanguage,
  addMessageToSession,
  getResponseLanguage,
} from './session';
import { setSessionState, interruptSession } from './hands-free/state-machine';

const log = createLogger('regen');

export type RegenIntent =
  | 'research'
  | 'automate'
  | 'trade'
  | 'explain_page'
  | 'navigate'
  | 'click'
  | 'scroll'
  | 'open_tabs'
  | 'watch_page'
  | 'general';

export interface RegenMessage {
  sessionId: string;
  message: string;
  mode?: 'research' | 'trade' | 'browser' | 'automation' | 'handsFree';
  source?: 'text' | 'voice';
  tabId?: string;
  context?: {
    url?: string;
    title?: string;
    dom?: string; // Added for hands-free reading
  };
}

export interface RegenResponse {
  intent: RegenIntent;
  text: string;
  commands?: RegenCommand[];
  metadata?: Record<string, unknown>;
}

export interface RegenCommand {
  type: 'OPEN_TAB' | 'SCROLL' | 'CLICK' | 'GET_DOM' | 'TYPE' | 'WAIT';
  payload: Record<string, unknown>;
}

/**
 * Detect user intent from message
 */
export async function detectIntent(message: string): Promise<RegenIntent> {
  const lower = message.toLowerCase();

  // Research intent
  if (
    lower.includes('research') ||
    lower.includes('find') ||
    lower.includes('search') ||
    lower.includes('best') ||
    lower.includes('top') ||
    lower.includes('compare')
  ) {
    return 'research';
  }

  // Automation intent
  if (
    lower.includes('automate') ||
    lower.includes('watch') ||
    lower.includes('monitor') ||
    lower.includes('alert') ||
    lower.includes('schedule')
  ) {
    return 'automate';
  }

  // Navigation intent
  if (
    lower.includes('open') ||
    lower.includes('go to') ||
    lower.includes('navigate') ||
    lower.includes('visit')
  ) {
    return 'open_tabs';
  }

  // Page interaction
  if (lower.includes('click') || lower.includes('button') || lower.includes('link')) {
    return 'click';
  }

  if (lower.includes('scroll') || lower.includes('read') || lower.includes('slowly')) {
    return 'scroll';
  }

  // Explain page
  if (
    lower.includes('explain') ||
    lower.includes('what is') ||
    lower.includes('summarize') ||
    lower.includes('key points')
  ) {
    return 'explain_page';
  }

  // Trade intent (future)
  if (lower.includes('trade') || lower.includes('buy') || lower.includes('sell')) {
    return 'trade';
  }

  return 'general';
}

/**
 * Handle Regen message and generate response
 */
export async function handleMessage(msg: RegenMessage): Promise<RegenResponse> {
  log.info('Handling Regen message', {
    sessionId: msg.sessionId,
    mode: msg.mode,
    source: msg.source,
  });

  // Step 0: Check for stop/interrupt commands (hands-free mode)
  const lowerMessage = msg.message.toLowerCase();
  if (
    lowerMessage.includes('stop') ||
    lowerMessage.includes('cancel') ||
    lowerMessage.includes('abort')
  ) {
    interruptSession(msg.sessionId);
    return {
      intent: 'general',
      text: 'Stopped hands-free actions.',
      commands: [],
    };
  }

  // Step 1: Load session (includes lastUserLanguage, mode, history)
  const session = getSession(msg.sessionId);
  log.info('Session loaded', {
    sessionId: msg.sessionId,
    mode: session.mode || msg.mode,
    lastLanguage: session.lastUserLanguage,
  });

  // Step 2: Detect language from message
  const detectedLang = detectLanguage(msg.message);
  log.info('Language detected', { sessionId: msg.sessionId, language: detectedLang });

  // Step 3: Update session with detected language
  updateSessionLanguage(msg.sessionId, detectedLang);
  addMessageToSession(msg.sessionId, 'user', msg.message, detectedLang);

  // Step 4: Enrich message with language and session context
  const enriched = {
    ...msg,
    mode: msg.mode || session.mode || 'research',
    detectedLanguage: detectedLang,
    responseLanguage: session.lastUserLanguage || detectedLang,
    session,
  };

  // Step 5: Update state machine (for hands-free mode)
  if (msg.source === 'voice') {
    setSessionState(msg.sessionId, 'EXECUTING');
  }

  // Step 6: Route to mode-specific handler
  let response: RegenResponse;

  switch (enriched.mode) {
    case 'trade':
      response = await handleTradeQuery(enriched, detectedLang);
      break;

    case 'browser':
      // Browser navigation mode (scroll, click, navigate)
      response = await handleBrowserNav(enriched, detectedLang);
      break;

    case 'automation':
      // Automation mode (create/stop workflows)
      response = await handleAutomation(enriched, detectedLang);
      break;

    case 'research':
    default:
      // Default: research mode
      response = await handleResearchQuery(enriched, detectedLang);
      break;
  }

  // Step 7: Add assistant message to session
  addMessageToSession(
    msg.sessionId,
    'assistant',
    response.text,
    getResponseLanguage(msg.sessionId)
  );

  // Step 8: Update state machine back to IDLE
  if (msg.source === 'voice') {
    setSessionState(msg.sessionId, 'IDLE');
  }

  return response;
}

/**
 * Extract URLs from message
 */
function _extractUrls(message: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = message.match(urlRegex);
  if (matches) {
    return matches;
  }

  // If no URLs, treat as search terms
  // Return empty array - will be handled by research workflow
  return [];
}

/**
 * Extract CSS selector from message
 */
function _extractSelector(message: string): string {
  // Simple extraction - in production, use LLM to understand intent
  const lower = message.toLowerCase();

  if (lower.includes('button')) {
    return 'button';
  }
  if (lower.includes('link')) {
    return 'a';
  }
  if (lower.includes('form') || lower.includes('submit')) {
    return 'form';
  }

  return ''; // Will need DOM analysis
}
