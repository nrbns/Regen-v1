/**
 * SSE Signal Service - Server-Sent Events for real-time signals
 * Phase 1, Day 9: SSE Push for Signals
 */

export interface SSESignal {
  type: 'trade_signal' | 'price_update' | 'alert' | 'notification';
  symbol?: string;
  action?: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number;
  reason?: string;
  price?: number;
  change?: number;
  message?: string;
  timestamp: number;
  data?: Record<string, any>;
}

export type SSESignalCallback = (signal: SSESignal) => void;

export interface SSEConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: number;
  reconnectAttempts: number;
  error?: string;
}

/**
 * Phase 1, Day 9: SSE Signal Service with auto-reconnect
 */
export class SSESignalService {
  private eventSource: EventSource | null = null;
  private callbacks: Set<SSESignalCallback> = new Set();
  private statusCallbacks: Set<(status: SSEConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20; // More attempts for SSE
  private reconnectDelay = 2000; // Start with 2s delay
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribedChannels = new Set<string>();
  private connectionStatus: SSEConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0,
  };
  private sseUrl: string;

  constructor(sseUrl?: string) {
    this.sseUrl = sseUrl || import.meta.env.VITE_SSE_URL || 'http://127.0.0.1:18080/sse/signals';
  }

  /**
   * Phase 1, Day 9: Subscribe to signals
   */
  subscribe(channel: string, callback: SSESignalCallback): () => void {
    this.callbacks.add(callback);
    this.subscribedChannels.add(channel);

    // Connect if not already connected
    if (!this.connectionStatus.connected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      this.subscribedChannels.delete(channel);

      // Disconnect if no more callbacks
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Phase 1, Day 9: Subscribe to connection status updates
   */
  onStatusChange(callback: (status: SSEConnectionStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback({ ...this.connectionStatus });

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Phase 1, Day 9: Connect to SSE endpoint
   */
  private connect(): void {
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
      return;
    }

    // Close existing connection if any
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Build URL with channels
    const channels = Array.from(this.subscribedChannels);
    const url = new URL(this.sseUrl);
    if (channels.length > 0) {
      url.searchParams.set('channels', channels.join(','));
    }

    console.log('[SSESignalService] Connecting to', url.toString());

    try {
      this.updateStatus({
        connected: false,
        reconnecting: this.reconnectAttempts > 0,
        reconnectAttempts: this.reconnectAttempts,
      });

      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = () => {
        console.log('[SSESignalService] SSE connected');
        this.reconnectAttempts = 0;
        this.updateStatus({
          connected: true,
          reconnecting: false,
          reconnectAttempts: 0,
          lastConnected: Date.now(),
        });
      };

      // Phase 1, Day 9: Handle different event types
      this.eventSource.addEventListener('signal', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignal({
            type: data.type || 'notification',
            symbol: data.symbol,
            action: data.action,
            confidence: data.confidence,
            reason: data.reason,
            price: data.price,
            change: data.change,
            message: data.message,
            timestamp: data.timestamp || Date.now(),
            data: data.data,
          });
        } catch (error) {
          console.error('[SSESignalService] Failed to parse signal:', error);
        }
      });

      this.eventSource.addEventListener('trade_signal', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignal({
            type: 'trade_signal',
            symbol: data.symbol,
            action: data.action,
            confidence: data.confidence,
            reason: data.reason,
            timestamp: data.timestamp || Date.now(),
            data: data,
          });
        } catch (error) {
          console.error('[SSESignalService] Failed to parse trade signal:', error);
        }
      });

      this.eventSource.addEventListener('price_update', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignal({
            type: 'price_update',
            symbol: data.symbol,
            price: data.price,
            change: data.change,
            timestamp: data.timestamp || Date.now(),
            data: data,
          });
        } catch (error) {
          console.error('[SSESignalService] Failed to parse price update:', error);
        }
      });

      this.eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSignal({
            type: 'notification',
            message: data.message || 'SSE error',
            timestamp: Date.now(),
            data: data,
          });
        } catch {
          // Ignore parse errors for error events
        }
      });

      // Phase 1, Day 9: Handle connection errors
      this.eventSource.onerror = (error) => {
        console.error('[SSESignalService] SSE error:', error);
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.updateStatus({
            connected: false,
            reconnecting: true,
            reconnectAttempts: this.reconnectAttempts,
            error: 'Connection closed',
          });
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // Still connecting, wait
          this.updateStatus({
            connected: false,
            reconnecting: true,
            reconnectAttempts: this.reconnectAttempts,
            error: 'Connecting...',
          });
        }
      };
    } catch (error) {
      console.error('[SSESignalService] Failed to create EventSource:', error);
      this.updateStatus({
        connected: false,
        reconnecting: true,
        reconnectAttempts: this.reconnectAttempts,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Phase 1, Day 9: Handle incoming signal
   */
  private handleSignal(signal: SSESignal): void {
    // Notify all callbacks
    this.callbacks.forEach(cb => {
      try {
        cb(signal);
      } catch (error) {
        console.error('[SSESignalService] Callback error', error);
      }
    });
  }

  /**
   * Phase 1, Day 9: Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSESignalService] Max reconnect attempts reached');
      this.updateStatus({
        connected: false,
        reconnecting: false,
        reconnectAttempts: this.reconnectAttempts,
        error: 'Max reconnect attempts reached',
      });
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30s delay
    );

    console.log(
      `[SSESignalService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.updateStatus({
      connected: false,
      reconnecting: true,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.reconnectTimeout = setTimeout(() => {
      if (this.callbacks.size > 0) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Phase 1, Day 9: Disconnect from SSE
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateStatus({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
    });
  }

  /**
   * Phase 1, Day 9: Update connection status and notify callbacks
   */
  private updateStatus(status: Partial<SSEConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    this.statusCallbacks.forEach(cb => {
      try {
        cb({ ...this.connectionStatus });
      } catch (error) {
        console.error('[SSESignalService] Status callback error:', error);
      }
    });
  }

  /**
   * Phase 1, Day 9: Get current connection status
   */
  getStatus(): SSEConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Phase 1, Day 9: Manually reconnect
   */
  reconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    if (this.callbacks.size > 0) {
      this.connect();
    }
  }
}

// Singleton instance
let instance: SSESignalService | null = null;

export function getSSESignalService(sseUrl?: string): SSESignalService {
  if (!instance) {
    instance = new SSESignalService(sseUrl);
  }
  return instance;
}

