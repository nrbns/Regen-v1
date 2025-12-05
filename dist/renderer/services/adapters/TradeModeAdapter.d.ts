/**
 * Trade Mode Adapter
 *
 * Provides unified interface for:
 * - getPrice(symbol)
 * - getHistorical(symbol, timeframe)
 * - getMarketNews(symbol?)
 */
export interface PriceData {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume?: number;
    timestamp: number;
}
export interface HistoricalData {
    symbol: string;
    timeframe: string;
    data: Array<{
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>;
}
export interface MarketNews {
    title: string;
    source: string;
    url: string;
    publishedAt: number;
    summary?: string;
}
export declare class TradeModeAdapter {
    private client;
    /**
     * Get current price for a symbol
     */
    getPrice(symbol: string): Promise<PriceData>;
    /**
     * Get historical data for a symbol
     */
    getHistorical(symbol: string, timeframe?: '1d' | '1w' | '1m' | '1y'): Promise<HistoricalData>;
    /**
     * Get market news
     */
    getMarketNews(symbol?: string): Promise<MarketNews[]>;
}
export declare function getTradeAdapter(): TradeModeAdapter;
