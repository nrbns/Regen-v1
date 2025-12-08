/**
 * Trade Signal Service - Telepathy Upgrade Phase 2
 * WebSocket push for instant trade signals (replaces 30s polling)
 * Phase 1, Day 9: Enhanced with SSE fallback and auto-reconnect
 */
export interface TradeSignal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reason: string;
    timestamp: number;
}
export type TradeSignalCallback = (signal: TradeSignal) => void;
declare class TradeSignalService {
    private ws;
    private sseFallback;
    private useSSE;
    private callbacks;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private reconnectTimeout;
    private subscribedSymbols;
    private isConnected;
    /**
     * Subscribe to trade signals for a symbol
     */
    subscribe(symbol: string, callback: TradeSignalCallback): () => void;
    /**
     * Connect to WebSocket server
     */
    private connect;
    /**
     * Phase 1, Day 9: Connect via SSE as fallback
     */
    private connectSSE;
    /**
     * Subscribe to a specific symbol
     */
    private subscribeToSymbol;
    /**
     * Schedule reconnection
     */
    private scheduleReconnect;
    /**
     * Disconnect from WebSocket/SSE
     */
    private disconnect;
}
export declare function getTradeSignalService(): TradeSignalService;
export {};
