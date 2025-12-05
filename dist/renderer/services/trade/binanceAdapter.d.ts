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
declare class BinanceAdapter {
    private ws;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private subscribers;
    private isPaperTrade;
    /**
     * Connect to Binance WebSocket (mock for paper trading)
     */
    connect(symbols?: string[]): Promise<void>;
    /**
     * Mock WebSocket for paper trading
     */
    private startMockWebSocket;
    /**
     * Get mock base price for symbol
     */
    private getMockBasePrice;
    /**
     * Attempt to reconnect WebSocket
     */
    private attemptReconnect;
    /**
     * Subscribe to market data updates
     */
    subscribe(callback: (data: MarketData) => void): () => void;
    /**
     * Notify all subscribers
     */
    private notifySubscribers;
    /**
     * Place order (paper trade stub)
     */
    placeOrder(order: TradeOrder): Promise<{
        orderId: string;
        status: string;
    }>;
    /**
     * Get positions (paper trade stub)
     */
    getPositions(): Promise<TradePosition[]>;
    /**
     * Disconnect WebSocket
     */
    disconnect(): void;
    /**
     * Set paper trade mode
     */
    setPaperTradeMode(enabled: boolean): void;
}
export declare const binanceAdapter: BinanceAdapter;
export {};
