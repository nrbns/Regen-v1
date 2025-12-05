export interface RealtimeTick {
    price: number;
    volume: number;
    timestamp: number;
    bid?: number;
    ask?: number;
}
export interface RealtimeCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
interface UseRealtimeTradeOptions {
    symbol: string;
    enabled?: boolean;
    onTick?: (tick: RealtimeTick) => void;
    onCandle?: (candle: RealtimeCandle) => void;
}
export interface OrderBookUpdate {
    bids: Array<{
        price: number;
        size: number;
    }>;
    asks: Array<{
        price: number;
        size: number;
    }>;
}
export declare function useRealtimeTrade({ symbol, enabled, onTick, onCandle, }: UseRealtimeTradeOptions): {
    tick: RealtimeTick | null;
    connected: boolean;
    error: string | null;
    orderbook: OrderBookUpdate | null;
};
export {};
