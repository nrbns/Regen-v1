/**
 * Session Service - Tier 1
 * Handles saving and restoring browser sessions
 */

import type { Tab } from '../state/tabsStore';
import type { AppState } from '../state/appStore';

export type SessionState = {
  tabs: Tab[];
  activeTabId: string | null;
  mode: AppState['mode'];
  savedAt: number;
};

const SESSION_KEY = 'omnibrowser_session_v1';
const SAVE_DEBOUNCE_MS = 2000; // Save 2 seconds after last change

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Save session to localStorage
 */
export function saveSession(state: SessionState): void {
  try {
    const serialized = JSON.stringify({
      ...state,
      savedAt: Date.now(),
    });
    localStorage.setItem(SESSION_KEY, serialized);
  } catch (error) {
    console.error('[Session] Failed to save session:', error);
  }
}

/**
 * Load session from localStorage
 */
export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SessionState;

    // Validate session structure
    if (!parsed.tabs || !Array.isArray(parsed.tabs)) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[Session] Failed to load session:', error);
    return null;
  }
}

/**
 * Clear saved session
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('[Session] Failed to clear session:', error);
  }
}

/**
 * Debounced save - waits for quiet period before saving
 */
export function debouncedSaveSession(state: SessionState): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    saveSession(state);
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Get session summary for UI display
 */
export function getSessionSummary(): { tabCount: number; savedAt: number | null } | null {
  const session = loadSession();
  if (!session) return null;

  return {
    tabCount: session.tabs.length,
    savedAt: session.savedAt,
  };
}
