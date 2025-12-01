/**
 * Binance Trade Adapter - PR 006
 * WebSocket subscription and mock placeOrder for paper trading
 */

export interface TradeOrder {
  symbol: string;
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  side: 'buy' | 'sell';
}

export interface TradePosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  unrealizedPnl: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

class BinanceAdapter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers = new Set<(data: MarketData) => void>();
  private isPaperTrade = true;

  /**
   * Connect to Binance WebSocket (mock for paper trading)
   */
  connect(symbols: string[] = ['BTCUSDT', 'ETHUSDT']): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For paper trading, use mock WebSocket
        if (this.isPaperTrade) {
          this.startMockWebSocket(symbols);
          resolve();
          return;
        }

        // Real Binance WebSocket (for future implementation)
        const streamNames = symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[BinanceAdapter] WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            if (data.stream && data.data) {
              const marketData: MarketData = {
                symbol: data.data.s,
                price: parseFloat(data.data.c),
                volume: parseFloat(data.data.v),
                timestamp: Date.now(),
              };
              this.notifySubscribers(marketData);
            }
          } catch (error) {
            console.error('[BinanceAdapter] Error parsing message:', error);
          }
        };

        this.ws.onerror = error => {
          console.error('[BinanceAdapter] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[BinanceAdapter] WebSocket closed');
          this.attemptReconnect(symbols);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Mock WebSocket for paper trading
   */
  private startMockWebSocket(symbols: string[]): void {
    console.log('[BinanceAdapter] Starting mock WebSocket for paper trading');

    // Simulate market data updates
    const interval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.CLOSED) {
        clearInterval(interval);
        return;
      }

      symbols.forEach(symbol => {
        const basePrice = this.getMockBasePrice(symbol);
        const price = basePrice + (Math.random() - 0.5) * basePrice * 0.02; // ±1% variation
        const volume = Math.random() * 1000000;

        const marketData: MarketData = {
          symbol,
          price,
          volume,
          timestamp: Date.now(),
        };

        this.notifySubscribers(marketData);
      });
    }, 1000); // Update every second
  }

  /**
   * Get mock base price for symbol
   */
  private getMockBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTCUSDT: 45000,
      ETHUSDT: 2500,
      BNBUSDT: 300,
      ADAUSDT: 0.5,
      SOLUSDT: 100,
    };
    return prices[symbol] || 100;
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(symbols: string[]): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[BinanceAdapter] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`[BinanceAdapter] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect(symbols).catch(console.error);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Subscribe to market data updates
   */
  subscribe(callback: (data: MarketData) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(data: MarketData): void {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[BinanceAdapter] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Place order (paper trade stub)
   */
  async placeOrder(order: TradeOrder): Promise<{ orderId: string; status: string }> {
    if (this.isPaperTrade) {
      // Mock order execution
      const orderId = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('[BinanceAdapter] Paper trade order placed:', orderId, order);

      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        orderId,
        status: 'filled',
      };
    }

    // Real order execution (for future implementation)
    throw new Error('Real trading not implemented yet');
  }

  /**
   * Get positions (paper trade stub)
   */
  async getPositions(): Promise<TradePosition[]> {
    if (this.isPaperTrade) {
      // Return mock positions
      return [];
    }

    // Real positions (for future implementation)
    throw new Error('Real trading not implemented yet');
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Set paper trade mode
   */
  setPaperTradeMode(enabled: boolean): void {
    this.isPaperTrade = enabled;
  }
}

export const binanceAdapter = new BinanceAdapter();
