/**
 * Realtime Bus Client
 * Frontend WebSocket client for message bus
 * PR: Frontend-bus integration
 */

const BUS_URL = import.meta.env.VITE_BUS_URL || 'ws://localhost:4002';

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

        // Resubscribe to all channels
        this.subscribers.forEach((handlers, channel) => {
          // Re-add all handlers for this channel
          handlers.forEach(handler => {
            this.subscribe(channel, handler);
          });
        });

        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: BusMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[BusClient] Message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[BusClient] WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('[BusClient] Disconnected');

        // Auto-reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          console.log(`[BusClient] Reconnecting in ${delay}ms...`);
          this.reconnectTimer = setTimeout(() => {
            this.connect().catch(console.error);
          }, delay);
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
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel,
      }));
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
            this.ws.send(JSON.stringify({
              type: 'unsubscribe',
              channel,
            }));
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

      this.ws.send(JSON.stringify({
        type: 'publish',
        channel,
        data,
      }));

      // Wait for published confirmation
      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout'));
      }, 5000);

      const originalOnMessage = this.ws.onmessage;
      this.ws.onmessage = (event) => {
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
}

// Singleton instance
export const busClient = new BusClient();

// Auto-connect on import (in browser)
if (typeof window !== 'undefined') {
  busClient.connect().catch(console.error);
}

