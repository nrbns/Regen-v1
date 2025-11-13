/**
 * Market Data Service
 * 
 * Handles WebSocket connections for real-time market data
 * and REST API calls for historical data.
 * 
 * Supports:
 * - Polygon.io (US equities)
 * - Massive (formerly Polygon)
 * - Binance (crypto)
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
// import * as https from 'https'; // Reserved for future use
// import * as http from 'http'; // Reserved for future use

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataConfig {
  provider: 'polygon' | 'massive' | 'binance' | 'mock';
  apiKey?: string;
  paper?: boolean;
}

export class MarketDataService extends EventEmitter {
  private config: MarketDataConfig;
  private ws: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(config: MarketDataConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.config.provider === 'mock') {
      // Mock mode - no real connection
      this.isConnected = true;
      this.emit('connected');
      return;
    }

    // TODO: Implement real WebSocket connections
    // For now, use mock mode
    this.isConnected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    this.emit('disconnected');
  }

  subscribe(symbols: string[]): void {
    symbols.forEach((symbol) => {
      this.subscriptions.add(symbol);
    });

    if (this.config.provider === 'mock') {
      // Start mock data stream
      this.startMockDataStream();
    } else {
      // TODO: Send subscription message to WebSocket
    }
  }

  unsubscribe(symbols: string[]): void {
    symbols.forEach((symbol) => {
      this.subscriptions.delete(symbol);
    });
  }

  async getQuote(symbol: string): Promise<Quote> {
    if (this.config.provider === 'mock') {
      // Generate mock quote
      const basePrice = this.getMockPrice(symbol);
      const spread = basePrice * 0.0001; // 0.01% spread
      return {
        symbol,
        bid: basePrice - spread / 2,
        ask: basePrice + spread / 2,
        last: basePrice,
        volume: Math.floor(Math.random() * 2000000) + 500000,
        timestamp: Date.now(),
      };
    }

    // TODO: Implement real API calls
    throw new Error('Real market data not yet implemented');
  }

  async getCandles(
    symbol: string,
    timeframe: string,
    from: number,
    to: number
  ): Promise<Candle[]> {
    if (this.config.provider === 'mock') {
      // Generate mock candles
      return this.generateMockCandles(symbol, timeframe, from, to);
    }

    // TODO: Implement real API calls
    return [];
  }

  private startMockDataStream(): void {
    // Emit mock quotes periodically
    const interval = setInterval(() => {
      if (!this.isConnected || this.subscriptions.size === 0) {
        clearInterval(interval);
        return;
      }

      this.subscriptions.forEach((symbol) => {
        const quote = {
          symbol,
          bid: this.getMockPrice(symbol) - 0.01,
          ask: this.getMockPrice(symbol) + 0.01,
          last: this.getMockPrice(symbol),
          volume: Math.floor(Math.random() * 2000000) + 500000,
          timestamp: Date.now(),
        };

        this.emit('quote', quote);
      });
    }, 1000); // Update every second
  }

  private getMockPrice(symbol: string): number {
    // Simple hash-based price generator for consistency
    const basePrices: Record<string, number> = {
      AAPL: 150,
      MSFT: 380,
      GOOGL: 142,
      TSLA: 245,
    };

    const base = basePrices[symbol] || 100;
    const variation = (Math.sin(Date.now() / 10000) + 1) * 0.02; // ±2% variation
    return base * (1 + variation);
  }

  private generateMockCandles(
    symbol: string,
    timeframe: string,
    from: number,
    to: number
  ): Candle[] {
    const candles: Candle[] = [];
    const interval = this.getTimeframeInterval(timeframe);
    let currentTime = from;
    let price = this.getMockPrice(symbol);

    while (currentTime < to) {
      const change = (Math.random() - 0.5) * 2;
      price += change;
      const open = price;
      const close = price + (Math.random() - 0.5) * 1;
      const high = Math.max(open, close) + Math.random() * 0.5;
      const low = Math.min(open, close) - Math.random() * 0.5;

      candles.push({
        time: currentTime,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000) + 100000,
      });

      currentTime += interval;
    }

    return candles;
  }

  private getTimeframeInterval(timeframe: string): number {
    const intervals: Record<string, number> = {
      '1': 60, // 1 minute
      '5': 300, // 5 minutes
      '15': 900, // 15 minutes
      '60': 3600, // 1 hour
      '240': 14400, // 4 hours
      '1D': 86400, // 1 day
    };

    return intervals[timeframe] || 3600;
  }
}

// Singleton instance
let marketDataService: MarketDataService | null = null;

export function getMarketDataService(config?: MarketDataConfig): MarketDataService {
  if (!marketDataService) {
    marketDataService = new MarketDataService(config || { provider: 'mock' });
  }
  return marketDataService;
}

