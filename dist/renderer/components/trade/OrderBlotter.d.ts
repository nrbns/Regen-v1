export interface Order {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    filledQuantity: number;
    orderType: string;
    status: string;
    limitPrice?: number;
    stopPrice?: number;
    averageFillPrice?: number;
    createdAt: number;
    filledAt?: number;
    paper: boolean;
}
interface OrderBlotterProps {
    onOrderClick?: (order: Order) => void;
    showPaperOnly?: boolean;
}
export default function OrderBlotter({ onOrderClick, showPaperOnly }: OrderBlotterProps): import("react/jsx-runtime").JSX.Element;
export {};
