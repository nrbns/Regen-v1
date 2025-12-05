export interface OrderBookEntry {
    price: number;
    quantity: number;
    cumulative?: number;
}
interface OrderBookProps {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    maxDepth?: number;
    onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
}
export default function OrderBook({ bids, asks, maxDepth, onPriceClick }: OrderBookProps): import("react/jsx-runtime").JSX.Element;
export {};
