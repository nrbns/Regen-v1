/**
 * Session Service - Tier 1
 * Handles saving and restoring browser sessions
 */
const SESSION_KEY = 'regen_session_v1';
const SAVE_DEBOUNCE_MS = 2000; // Save 2 seconds after last change
let saveTimer = null;
/**
 * Save session to localStorage
 */
export function saveSession(state) {
    try {
        const serialized = JSON.stringify({
            ...state,
            savedAt: Date.now(),
        });
        localStorage.setItem(SESSION_KEY, serialized);
    }
    catch (error) {
        console.error('[Session] Failed to save session:', error);
    }
}
/**
 * Load session from localStorage
 */
export function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        // Validate session structure
        if (!parsed.tabs || !Array.isArray(parsed.tabs)) {
            return null;
        }
        return parsed;
    }
    catch (error) {
        console.error('[Session] Failed to load session:', error);
        return null;
    }
}
/**
 * Clear saved session
 */
export function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
    }
    catch (error) {
        console.error('[Session] Failed to clear session:', error);
    }
}
/**
 * Debounced save - waits for quiet period before saving
 */
export function debouncedSaveSession(state) {
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
export function getSessionSummary() {
    const session = loadSession();
    if (!session)
        return null;
    return {
        tabCount: session.tabs.length,
        savedAt: session.savedAt,
    };
}
