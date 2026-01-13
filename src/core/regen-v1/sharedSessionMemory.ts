/**
 * Shared Session Memory
 * 
 * Provides shared memory across tabs for realtime state synchronization.
 * Uses BroadcastChannel for fast cross-tab communication.
 */

const MEMORY_CHANNEL_NAME = 'regen-shared-memory';
const MEMORY_STORAGE_KEY = 'regen-shared-memory-state';

export interface SharedSessionState {
  activeTabId: string | null;
  lastActivity: number;
  activeAutomations: string[];
  queuedEvents: number;
  sessionStartTime: number;
}

let broadcastChannel: BroadcastChannel | null = null;
let sharedState: SharedSessionState = {
  activeTabId: null,
  lastActivity: Date.now(),
  activeAutomations: [],
  queuedEvents: 0,
  sessionStartTime: Date.now(),
};

let listeners: Set<(state: SharedSessionState) => void> = new Set();

/**
 * Initialize shared session memory
 */
export function initSharedSessionMemory(): () => void {
  // Load initial state from localStorage
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (stored) {
      sharedState = { ...sharedState, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('[SharedSessionMemory] Failed to load state:', error);
  }

  // Use BroadcastChannel if available
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel(MEMORY_CHANNEL_NAME);

    broadcastChannel.addEventListener('message', (event: MessageEvent) => {
      const { type, state } = event.data;
      if (type === 'state-update') {
        sharedState = { ...sharedState, ...state };
        saveToStorage();
        notifyListeners();
      }
    });
  } else {
    // Fallback to localStorage events
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === MEMORY_STORAGE_KEY && e.newValue) {
        try {
          sharedState = { ...sharedState, ...JSON.parse(e.newValue) };
          notifyListeners();
        } catch (error) {
          console.warn('[SharedSessionMemory] Failed to parse storage update:', error);
        }
      }
    });
  }

  console.log('[SharedSessionMemory] Initialized');

  return () => {
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
    console.log('[SharedSessionMemory] Cleaned up');
  };
}

/**
 * Update shared state
 */
export function updateSharedState(updates: Partial<SharedSessionState>): void {
  sharedState = { ...sharedState, ...updates };
  saveToStorage();
  notifyListeners();

  // Broadcast to other tabs
  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'state-update',
      state: updates,
    });
  } else {
    // Trigger storage event for other tabs
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(sharedState));
  }
}

/**
 * Get current shared state
 */
export function getSharedState(): SharedSessionState {
  return { ...sharedState };
}

/**
 * Subscribe to state changes
 */
export function onSharedStateChange(listener: (state: SharedSessionState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all listeners
 */
function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener(sharedState);
    } catch (error) {
      console.error('[SharedSessionMemory] Listener error:', error);
    }
  });
}

/**
 * Save state to localStorage
 */
function saveToStorage(): void {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(sharedState));
  } catch (error) {
    console.warn('[SharedSessionMemory] Failed to save state:', error);
  }
}

/**
 * Clear shared state
 */
export function clearSharedState(): void {
  sharedState = {
    activeTabId: null,
    lastActivity: Date.now(),
    activeAutomations: [],
    queuedEvents: 0,
    sessionStartTime: Date.now(),
  };
  saveToStorage();
  notifyListeners();

  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'state-update',
      state: sharedState,
    });
  }
}
