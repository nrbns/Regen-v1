/**
 * Cross-Tab Event Bus Synchronization
 * 
 * Synchronizes event bus events across multiple browser tabs/windows
 * using BroadcastChannel API for real-time cross-tab communication.
 */

import { regenEventBus, type RegenEvent } from './eventBus';

const CHANNEL_NAME = 'regen-event-bus-sync';
const TAB_ID_KEY = 'regen-tab-id';

// Generate unique tab ID
const getTabId = (): string => {
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  return tabId;
};

let broadcastChannel: BroadcastChannel | null = null;
let isInitialized = false;
let tabId: string;

/**
 * Initialize cross-tab event bus synchronization
 */
export function initCrossTabEventBus(): () => void {
  if (isInitialized) {
    console.warn('[CrossTabEventBus] Already initialized');
    return () => {};
  }

  // Check if BroadcastChannel is available
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[CrossTabEventBus] BroadcastChannel not available, using localStorage fallback');
    return initLocalStorageFallback();
  }

  tabId = getTabId();
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);

  // Listen for events from other tabs
  broadcastChannel.addEventListener('message', (event: MessageEvent) => {
    const { type, payload, sourceTabId } = event.data;

    // Ignore events from this tab (prevent loops)
    if (sourceTabId === tabId) {
      return;
    }

    // Re-emit event in this tab's event bus
    try {
      const regenEvent: RegenEvent = {
        type,
        payload,
      } as RegenEvent;

      regenEventBus.emit(regenEvent);
      console.log(`[CrossTabEventBus] Received event from tab ${sourceTabId}:`, type);
    } catch (error) {
      console.error('[CrossTabEventBus] Failed to re-emit event:', error);
    }
  });

  // Intercept regenEventBus.emit to broadcast to other tabs
  const originalEmit = regenEventBus.emit.bind(regenEventBus);
  (regenEventBus as any).emit = (event: RegenEvent) => {
    // Emit locally first
    originalEmit(event);

    // Broadcast to other tabs
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({
          type: event.type,
          payload: event.payload,
          sourceTabId: tabId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('[CrossTabEventBus] Failed to broadcast event:', error);
      }
    }
  };

  isInitialized = true;
  console.log(`[CrossTabEventBus] Initialized (tab ID: ${tabId})`);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
    // Restore original emit
    (regenEventBus as any).emit = originalEmit;
    isInitialized = false;
    console.log('[CrossTabEventBus] Cleaned up');
  };
}

/**
 * Fallback to localStorage events (for browsers without BroadcastChannel)
 */
function initLocalStorageFallback(): () => void {
  tabId = getTabId();
  let messageCounter = 0;

  // Listen for storage events from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key !== CHANNEL_NAME || !e.newValue) return;

    try {
      const data = JSON.parse(e.newValue);
      const { type, payload, sourceTabId, messageId } = data;

      // Ignore events from this tab
      if (sourceTabId === tabId) return;

      // Ignore duplicate messages
      const lastMessageId = parseInt(localStorage.getItem(`${CHANNEL_NAME}-last`) || '0');
      if (messageId <= lastMessageId) return;
      localStorage.setItem(`${CHANNEL_NAME}-last`, String(messageId));

      // Re-emit event
      const regenEvent: RegenEvent = {
        type,
        payload,
      } as RegenEvent;

      regenEventBus.emit(regenEvent);
      console.log(`[CrossTabEventBus] Received event from tab ${sourceTabId} (localStorage):`, type);
    } catch (error) {
      console.error('[CrossTabEventBus] Failed to parse storage event:', error);
    }
  };

  window.addEventListener('storage', handleStorage);

  // Intercept regenEventBus.emit to broadcast via localStorage
  const originalEmit = regenEventBus.emit.bind(regenEventBus);
  (regenEventBus as any).emit = (event: RegenEvent) => {
    // Emit locally first
    originalEmit(event);

    // Broadcast via localStorage
    messageCounter++;
    try {
      const message = {
        type: event.type,
        payload: event.payload,
        sourceTabId: tabId,
        messageId: messageCounter,
        timestamp: Date.now(),
      };
      localStorage.setItem(CHANNEL_NAME, JSON.stringify(message));
      // Remove after short delay to allow other tabs to read it
      setTimeout(() => {
        localStorage.removeItem(CHANNEL_NAME);
      }, 100);
    } catch (error) {
      console.error('[CrossTabEventBus] Failed to broadcast via localStorage:', error);
    }
  };

  isInitialized = true;
  console.log(`[CrossTabEventBus] Initialized with localStorage fallback (tab ID: ${tabId})`);

  return () => {
    window.removeEventListener('storage', handleStorage);
    // Restore original emit
    (regenEventBus as any).emit = originalEmit;
    isInitialized = false;
    console.log('[CrossTabEventBus] Cleaned up (localStorage)');
  };
}

/**
 * Get current tab ID
 */
export function getCurrentTabId(): string {
  return tabId || getTabId();
}

/**
 * Check if cross-tab sync is initialized
 */
export function isCrossTabSyncActive(): boolean {
  return isInitialized;
}
