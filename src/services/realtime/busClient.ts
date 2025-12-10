/**
 * Realtime Bus Client
 * Frontend WebSocket client for message bus
 * PR: Frontend-bus integration
 */

const BUS_URL = (() => {
  const baseUrl = import.meta.env.VITE_BUS_URL || 'localhost:4002';
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  const cleanUrl = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
  return `${protocol}${cleanUrl}`;
})();

export interface BusMessage {
  type: 'message' | 'connected' | 'subscribed' | 'published' | 'error' | 'history';
  channel?: string;
  data?: any;
  timestamp?: number;
  sender?: string;
}

export type MessageHandler = (message: BusMessage) => void;

class BusClient {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  /**
   * Connect to bus
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      console.log('[BusClient] Connecting to:', BUS_URL);

      this.ws = new WebSocket(BUS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[BusClient] Connected to bus');

        // Hide reconnecting banner
        this.hideReconnectingBanner();

        // Resubscribe to all channels
        this.subscribers.forEach((handlers, channel) => {
          // Re-add all handlers for this channel
          handlers.forEach(handler => {
            this.subscribe(channel, handler);
          });
        });

        resolve();
      };

      this.ws.onmessage = event => {
        try {
          const message: BusMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[BusClient] Message parse error:', error);
        }
      };

      this.ws.onerror = error => {
        console.error('[BusClient] WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('[BusClient] Disconnected');

        // Show reconnecting UI banner
        this.showReconnectingBanner();

        // Auto-reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts));
          console.log(`[BusClient] Reconnecting in ${delay}ms...`);
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch(console.error);
          }, delay);
        } else {
          this.hideReconnectingBanner();
        }
      };
    });
  }

  /**
   * Disconnect from bus
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel: string, handler: MessageHandler) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(handler);

    // Send subscribe message if connected
    if (this.isConnected && this.ws) {
      this.ws.send(
        JSON.stringify({
          type: 'subscribe',
          channel,
        })
      );
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribers.delete(channel);

          // Send unsubscribe message
          if (this.isConnected && this.ws) {
            this.ws.send(
              JSON.stringify({
                type: 'unsubscribe',
                channel,
              })
            );
          }
        }
      }
    };
  }

  /**
   * Publish message to channel
   */
  publish(channel: string, data: any): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.ws) {
        reject(new Error('Not connected to bus'));
        return;
      }

      this.ws.send(
        JSON.stringify({
          type: 'publish',
          channel,
          data,
        })
      );

      // Wait for published confirmation
      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout'));
      }, 5000);

      const originalOnMessage = this.ws.onmessage;
      this.ws.onmessage = event => {
        try {
          const message: BusMessage = JSON.parse(event.data);
          if (message.type === 'published' && message.channel === channel) {
            clearTimeout(timeout);
            this.ws!.onmessage = originalOnMessage;
            resolve((message.data as any)?.delivered || 0);
          }
        } catch {
          // Continue listening
        }
      };
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: BusMessage) {
    if (message.type === 'message' && message.channel) {
      const handlers = this.subscribers.get(message.channel);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('[BusClient] Handler error:', error);
          }
        });
      }
    }
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Show reconnecting banner UI
   */
  private showReconnectingBanner(): void {
    if (typeof window === 'undefined') return;

    // Remove existing banner if any
    const existing = document.getElementById('ws-reconnecting-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'ws-reconnecting-banner';
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: white;
      padding: 8px 16px;
      text-align: center;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    banner.textContent = 'Reconnecting...';
    document.body.appendChild(banner);
  }

  /**
   * Hide reconnecting banner UI
   */
  private hideReconnectingBanner(): void {
    if (typeof window === 'undefined') return;
    const banner = document.getElementById('ws-reconnecting-banner');
    if (banner) {
      banner.remove();
    }
  }
}

// Singleton instance
export const busClient = new BusClient();

// Auto-connect on import (in browser)
if (typeof window !== 'undefined') {
  busClient.connect().catch(console.error);
}
