export interface BracketOrder {
    stopLoss?: number;
    takeProfit?: number;
    stopLossType?: 'price' | 'percent' | 'atr';
    takeProfitType?: 'price' | 'percent' | 'atr';
}
export interface TrailingStop {
    distance: number;
    distanceType: 'price' | 'percent' | 'atr';
    activationPrice?: number;
}
export interface OrderRequest {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
    limitPrice?: number;
    stopPrice?: number;
    timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
    bracket?: BracketOrder;
    trailingStop?: TrailingStop;
    paper?: boolean;
}
interface OrderEntryProps {
    symbol: string;
    currentPrice: number;
    atr?: number;
    onSubmit: (order: OrderRequest) => void;
    aiSuggestion?: {
        action: 'buy' | 'sell';
        price: number;
        confidence: number;
        stopLoss?: number;
        takeProfit?: number;
    };
    preset?: {
        side: 'buy' | 'sell';
        price: number;
        stopLoss: number;
        takeProfit: number;
        quantity: number;
    };
}
export default function OrderEntry({ symbol, currentPrice, atr, onSubmit, aiSuggestion, preset, }: OrderEntryProps): import("react/jsx-runtime").JSX.Element;
export {};
