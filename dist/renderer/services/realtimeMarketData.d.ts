/**
 * Real-Time Market Data Service
 *
 * Connects to server SSE endpoint for sub-second price updates
 * Supports: NSE/BSE (via Finnhub), Crypto (via Binance), US markets
 */
export interface PriceUpdate {
    symbol: string;
    price: number;
    volume?: number;
    timestamp: number;
    change?: number;
    changePercent?: number;
}
export type PriceUpdateCallback = (update: PriceUpdate) => void;
declare class RealtimeMarketDataService {
    private eventSource;
    private callbacks;
    private currentSymbol;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    /**
     * Subscribe to real-time price updates for a symbol
     */
    subscribe(symbol: string, callback: PriceUpdateCallback): () => void;
    private connect;
    private scheduleReconnect;
    private disconnect;
    /**
     * Get historical candles for a symbol
     */
    getHistoricalCandles(symbol: string, resolution?: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M', _from?: number, _to?: number): Promise<Array<{
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>>;
}
export declare function getRealtimeMarketDataService(): RealtimeMarketDataService;
export {};
