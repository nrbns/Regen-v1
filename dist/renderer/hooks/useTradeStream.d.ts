/**
 * useTradeStream Hook
 * React hook for real-time trade data and order management
 */
interface OHLC {
    symbol: string;
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
interface OrderBook {
    symbol: string;
    timestamp: number;
    bids: Array<{
        price: number;
        size: number;
    }>;
    asks: Array<{
        price: number;
        size: number;
    }>;
}
interface Trade {
    symbol: string;
    timestamp: number;
    price: number;
    size: number;
    side: 'buy' | 'sell';
}
interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop';
    quantity: number;
    price?: number;
    status: 'pending' | 'processing' | 'filled' | 'cancelled' | 'rejected';
    createdAt: number;
    filledQuantity?: number;
    averageFillPrice?: number;
}
interface UseTradeStreamOptions {
    sessionId?: string;
    wsUrl?: string;
    autoReconnect?: boolean;
    onOHLC?: (data: OHLC) => void;
    onOrderBook?: (data: OrderBook) => void;
    onTrade?: (data: Trade) => void;
    onOrderUpdate?: (order: Order) => void;
    onError?: (error: string) => void;
}
interface UseTradeStreamReturn {
    isConnected: boolean;
    subscribe: (symbol: string) => Promise<void>;
    unsubscribe: (symbol: string) => Promise<void>;
    placeOrder: (order: Partial<Order>, idempotencyKey?: string) => Promise<Order>;
    cancelOrder: (orderId: string) => Promise<Order>;
    getOrders: (symbol?: string) => Promise<Order[]>;
    historical: OHLC[];
    orderbook: OrderBook | null;
    latestPrice: number | null;
}
export declare function useTradeStream(options?: UseTradeStreamOptions): UseTradeStreamReturn;
export {};
