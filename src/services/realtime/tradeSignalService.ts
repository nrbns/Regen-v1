/**
 * Trade Signal Service - Telepathy Upgrade Phase 2
 * WebSocket push for instant trade signals (replaces 30s polling)
 * Phase 1, Day 9: Enhanced with SSE fallback and auto-reconnect
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:18080';

export interface TradeSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  timestamp: number;
}

export type TradeSignalCallback = (signal: TradeSignal) => void;

class TradeSignalService {
  private ws: WebSocket | null = null;
  private sseFallback: ReturnType<typeof import('./sseSignalService').getSSESignalService> | null =
    null;
  private useSSE = false; // Phase 1, Day 9: Fallback to SSE if WebSocket fails
  private callbacks: Set<TradeSignalCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribedSymbols = new Set<string>();
  private isConnected = false;

  /**
   * Subscribe to trade signals for a symbol
   */
  subscribe(symbol: string, callback: TradeSignalCallback): () => void {
    const normalizedSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;

    this.callbacks.add(callback);
    this.subscribedSymbols.add(normalizedSymbol);

    // Connect if not already connected
    if (!this.isConnected) {
      this.connect();
    } else {
      // Subscribe to this symbol immediately
      this.subscribeToSymbol(normalizedSymbol);
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      this.subscribedSymbols.delete(normalizedSymbol);

      // Unsubscribe from symbol if no more callbacks
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_URL}/trade_signals`;
    console.log('[TradeSignalService] Connecting to', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log('[TradeSignalService] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Hide reconnecting banner
        this.hideReconnectingBanner();

        // Subscribe to all pending symbols
        this.subscribedSymbols.forEach(symbol => {
          this.subscribeToSymbol(symbol);
        });
      };

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'trade_signal') {
            const signal: TradeSignal = {
              symbol: data.symbol,
              action: data.action,
              confidence: data.confidence || 0,
              reason: data.reason || '',
              timestamp: data.timestamp || Date.now(),
            };

            // Notify all callbacks
            this.callbacks.forEach(cb => {
              try {
                cb(signal);
              } catch (error) {
                console.error('[TradeSignalService] Callback error', error);
              }
            });
          } else if (data.type === 'error') {
            console.error('[TradeSignalService] Server error', data.message);
          }
        } catch (error) {
          console.error('[TradeSignalService] Failed to parse message', error);
        }
      };

      this.ws.onerror = error => {
        console.error('[TradeSignalService] WebSocket error', error);
      };

      this.ws.onclose = () => {
        console.log('[TradeSignalService] WebSocket closed');
        this.isConnected = false;

        // Show reconnecting UI banner
        this.showReconnectingBanner();

        // Phase 1, Day 9: Try SSE fallback if WebSocket fails
        if (this.reconnectAttempts >= 3 && !this.useSSE) {
          console.log('[TradeSignalService] Switching to SSE fallback');
          this.useSSE = true;
          this.connectSSE();
        } else {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[TradeSignalService] Failed to create WebSocket', error);

      // Phase 1, Day 9: Try SSE fallback immediately on error
      if (!this.useSSE) {
        console.log('[TradeSignalService] Switching to SSE fallback');
        this.useSSE = true;
        this.connectSSE();
      } else {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Phase 1, Day 9: Connect via SSE as fallback
   */
  private connectSSE(): void {
    if (this.sseFallback) {
      return; // Already connected
    }

    try {
      const { getSSESignalService } = require('./sseSignalService');
      this.sseFallback = getSSESignalService();

      // Subscribe to trade signals via SSE
      this.subscribedSymbols.forEach(symbol => {
        const _unsubscribe = this.sseFallback!.subscribe(`trade_signals:${symbol}`, signal => {
          if (signal.type === 'trade_signal' && signal.action) {
            const tradeSignal: TradeSignal = {
              symbol: signal.symbol || symbol,
              action: signal.action,
              confidence: signal.confidence || 0,
              reason: signal.reason || '',
              timestamp: signal.timestamp,
            };

            // Notify all callbacks
            this.callbacks.forEach(cb => {
              try {
                cb(tradeSignal);
              } catch (error) {
                console.error('[TradeSignalService] Callback error', error);
              }
            });
          }
        });
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[TradeSignalService] Connected via SSE');
    } catch (error) {
      console.error('[TradeSignalService] Failed to connect via SSE', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to a specific symbol
   */
  private subscribeToSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: 'subscribe',
        symbol,
      })
    );
    console.log('[TradeSignalService] Subscribed to', symbol);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[TradeSignalService] Max reconnect attempts reached');
      this.hideReconnectingBanner();
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts)); // Exponential backoff, max 10s

    console.log(
      `[TradeSignalService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      if (this.callbacks.size > 0) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Show reconnecting banner UI
   */
  private showReconnectingBanner(): void {
    if (typeof window === 'undefined') return;

    const existing = document.getElementById('trade-ws-reconnecting-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'trade-ws-reconnecting-banner';
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
    banner.textContent = 'Reconnecting to trade signals...';
    document.body.appendChild(banner);
  }

  /**
   * Hide reconnecting banner UI
   */
  private hideReconnectingBanner(): void {
    if (typeof window === 'undefined') return;
    const banner = document.getElementById('trade-ws-reconnecting-banner');
    if (banner) {
      banner.remove();
    }
  }

  /**
   * Disconnect from WebSocket/SSE
   */
  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.sseFallback) {
      this.sseFallback.disconnect();
      this.sseFallback = null;
    }

    this.isConnected = false;
    this.useSSE = false;
  }
}

// Singleton instance
let instance: TradeSignalService | null = null;

export function getTradeSignalService(): TradeSignalService {
  if (!instance) {
    instance = new TradeSignalService();
  }
  return instance;
}
