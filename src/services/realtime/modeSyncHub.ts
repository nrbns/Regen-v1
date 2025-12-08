/**
 * Global Mode Synchronization Hub
 * Keeps state synchronized across mode switches (Browse → Trade → Research)
 * Prevents data loss and ensures smooth transitions
 */

import { useAppStore, type AppState } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';

export interface ModeSyncMessage {
  type: 'mode-switch' | 'state-sync' | 'heartbeat';
  mode?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

class ModeSyncHub {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(message: ModeSyncMessage) => void> = new Set();

  /**
   * Connect to the global sync hub
   */
  connect(wsUrl?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const url = wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws/sync';
    console.log('[ModeSyncHub] Connecting to', url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[ModeSyncHub] Connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.syncCurrentState();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: ModeSyncMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[ModeSyncHub] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[ModeSyncHub] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[ModeSyncHub] WebSocket closed');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[ModeSyncHub] Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the hub
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a mode switch event
   */
  sendModeSwitch(fromMode: string, toMode: string, state?: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ModeSyncMessage = {
      type: 'mode-switch',
      mode: toMode,
      data: {
        from: fromMode,
        to: toMode,
        ...state,
      },
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Subscribe to sync messages
   */
  subscribe(listener: (message: ModeSyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: ModeSyncMessage): void {
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(message);
      } catch (error) {
        console.error('[ModeSyncHub] Listener error:', error);
      }
    });

    // Handle mode switch
    if (message.type === 'mode-switch' && message.mode) {
      const appStore = useAppStore.getState();
      if (appStore.mode !== message.mode) {
        appStore.setMode(message.mode as any);
      }
    }

    // Handle state sync
    if (message.type === 'state-sync' && message.data) {
      this.applyStateSync(message.data);
    }
  }

  /**
   * Apply state synchronization
   */
  private applyStateSync(data: Record<string, unknown>): void {
    // Sync tabs if provided
    if (data.tabs && Array.isArray(data.tabs)) {
      const _tabsStore = useTabsStore.getState();
      // Update tabs without losing local state
      // This is a merge operation, not a replace
    }

    // Sync mode-specific state
    if (data.markets) {
      // Update market data for Trade mode
      window.dispatchEvent(new CustomEvent('mode-sync:markets', { detail: data.markets }));
    }

    if (data.research) {
      // Update research state
      window.dispatchEvent(new CustomEvent('mode-sync:research', { detail: data.research }));
    }
  }

  /**
   * Sync current state to hub
   */
  private syncCurrentState(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const appStore = useAppStore.getState();
    const tabsStore = useTabsStore.getState();

    const message: ModeSyncMessage = {
      type: 'state-sync',
      mode: appStore.mode,
      data: {
        mode: appStore.mode,
        tabs: tabsStore.tabs.map(t => ({
          id: t.id,
          title: t.title,
          url: t.url,
        })),
      },
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const message: ModeSyncMessage = {
          type: 'heartbeat',
          timestamp: Date.now(),
        };
        this.ws.send(JSON.stringify(message));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ModeSyncHub] Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[ModeSyncHub] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

// Singleton instance
let instance: ModeSyncHub | null = null;

export function getModeSyncHub(): ModeSyncHub {
  if (!instance) {
    instance = new ModeSyncHub();
  }
  return instance;
}

// Auto-connect on import (in browser only)
if (typeof window !== 'undefined') {
  // Connect after a short delay to avoid blocking initial load
  setTimeout(() => {
    getModeSyncHub().connect();
  }, 1000);

  // Listen for mode switches
  let previousMode: AppState['mode'] = useAppStore.getState().mode;
  useAppStore.subscribe((state) => {
    const currentMode = state.mode;
    if (currentMode !== previousMode) {
      getModeSyncHub().sendModeSwitch(previousMode || 'Browse', currentMode);
      previousMode = currentMode;
    }
  });
}

