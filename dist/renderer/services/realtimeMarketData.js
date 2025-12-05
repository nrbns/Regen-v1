/**
 * Real-Time Market Data Service
 *
 * Connects to server SSE endpoint for sub-second price updates
 * Supports: NSE/BSE (via Finnhub), Crypto (via Binance), US markets
 */
const API_BASE_URL = typeof window !== 'undefined'
    ? window.__API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
    : 'http://127.0.0.1:4000';
class RealtimeMarketDataService {
    eventSource = null;
    callbacks = new Map();
    currentSymbol = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    /**
     * Subscribe to real-time price updates for a symbol
     */
    subscribe(symbol, callback) {
        // Normalize symbol (remove exchange prefix if present)
        const normalizedSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
        // Add callback
        if (!this.callbacks.has(normalizedSymbol)) {
            this.callbacks.set(normalizedSymbol, new Set());
        }
        this.callbacks.get(normalizedSymbol).add(callback);
        // If this is a new symbol, reconnect
        if (this.currentSymbol !== normalizedSymbol) {
            this.currentSymbol = normalizedSymbol;
            this.connect(normalizedSymbol);
        }
        // Return unsubscribe function
        return () => {
            const callbacks = this.callbacks.get(normalizedSymbol);
            if (callbacks) {
                callbacks.delete(callback);
                if (callbacks.size === 0) {
                    this.callbacks.delete(normalizedSymbol);
                    this.disconnect();
                }
            }
        };
    }
    connect(symbol) {
        this.disconnect();
        const url = `${API_BASE_URL}/stock/stream/${symbol}`;
        console.log(`[RealtimeMarketData] Connecting to ${url}`);
        try {
            this.eventSource = new EventSource(url);
            this.reconnectAttempts = 0;
            this.eventSource.onopen = () => {
                console.log(`[RealtimeMarketData] Connected for ${symbol}`);
                this.reconnectAttempts = 0;
            };
            this.eventSource.onmessage = event => {
                try {
                    // Handle SSE ping
                    if (event.data === ': ping' || event.data.trim() === '') {
                        return;
                    }
                    const data = JSON.parse(event.data);
                    // Handle subscription confirmation
                    if (data.status === 'subscribed') {
                        console.log(`[RealtimeMarketData] Subscribed to ${data.symbol}`);
                        return;
                    }
                    // Handle price updates
                    if (data.price !== undefined) {
                        const update = {
                            symbol: data.symbol || symbol,
                            price: Number(data.price),
                            volume: data.volume ? Number(data.volume) : undefined,
                            timestamp: data.timestamp || Date.now(),
                        };
                        // Calculate change if we have previous price
                        const callbacks = this.callbacks.get(symbol);
                        if (callbacks) {
                            callbacks.forEach(cb => cb(update));
                        }
                    }
                    // Handle stream closed/error
                    if (data.status === 'closed' || data.status === 'error') {
                        console.warn(`[RealtimeMarketData] Stream ${data.status} for ${symbol}`);
                        if (data.status === 'error') {
                            this.scheduleReconnect(symbol);
                        }
                    }
                }
                catch (error) {
                    console.error('[RealtimeMarketData] Failed to parse SSE message:', error);
                }
            };
            this.eventSource.onerror = error => {
                console.error(`[RealtimeMarketData] SSE error for ${symbol}:`, error);
                this.eventSource?.close();
                this.scheduleReconnect(symbol);
            };
        }
        catch (error) {
            console.error(`[RealtimeMarketData] Failed to create EventSource for ${symbol}:`, error);
            this.scheduleReconnect(symbol);
        }
    }
    scheduleReconnect(symbol) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[RealtimeMarketData] Max reconnect attempts reached for ${symbol}`);
            return;
        }
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        console.log(`[RealtimeMarketData] Reconnecting to ${symbol} in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => {
            if (this.currentSymbol === symbol && this.callbacks.has(symbol)) {
                this.connect(symbol);
            }
        }, delay);
    }
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
    /**
     * Get historical candles for a symbol
     */
    async getHistoricalCandles(symbol, resolution = 'D', _from, _to) {
        try {
            // Use Finnhub API via server
            const normalizedSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
            // const toTimestamp = to || Math.floor(Date.now() / 1000);
            // const fromTimestamp = from || toTimestamp - (resolution === 'D' ? 86400 * 50 : 86400 * 7);
            // Use Finnhub API via server proxy
            const response = await fetch(`${API_BASE_URL}/api/trade/candles/${normalizedSymbol}?interval=${resolution}&limit=50`);
            if (!response.ok) {
                throw new Error(`Failed to fetch candles: ${response.statusText}`);
            }
            const data = await response.json();
            // Convert to lightweight-charts format
            if (data.candles && Array.isArray(data.candles)) {
                return data.candles.map((c) => ({
                    time: (c.timestamp || c.time) * 1000,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                    volume: c.volume || 0,
                }));
            }
            // Fallback: try Finnhub format
            if (data.c && Array.isArray(data.c)) {
                return data.c.map((_, i) => ({
                    time: (data.t[i] || Date.now() / 1000) * 1000,
                    open: data.o[i],
                    high: data.h[i],
                    low: data.l[i],
                    close: data.c[i],
                    volume: data.v[i] || 0,
                }));
            }
            return [];
        }
        catch (error) {
            console.error('[RealtimeMarketData] Failed to fetch historical candles:', error);
            return [];
        }
    }
}
// Singleton instance
let instance = null;
export function getRealtimeMarketDataService() {
    if (!instance) {
        instance = new RealtimeMarketDataService();
    }
    return instance;
}
