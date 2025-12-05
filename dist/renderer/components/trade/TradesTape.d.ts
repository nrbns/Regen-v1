export interface Trade {
    id: string;
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    timestamp: number;
}
interface TradesTapeProps {
    trades: Trade[];
    maxVisible?: number;
    symbol?: string;
}
export default function TradesTape({ trades, maxVisible, symbol }: TradesTapeProps): import("react/jsx-runtime").JSX.Element;
export {};
