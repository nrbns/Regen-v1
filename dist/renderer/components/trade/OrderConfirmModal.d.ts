export interface OrderDetails {
    side: 'buy' | 'sell';
    symbol: string;
    quantity: number;
    price: number;
    orderType: 'market' | 'limit';
    stopLoss?: number;
    takeProfit?: number;
    estimatedCost: number;
    fees: number;
    marginRequired?: number;
    riskMetrics?: {
        riskAmount: number;
        rewardAmount: number;
        riskRewardRatio: number;
        maxLoss: number;
        maxGain: number;
        riskPercentage: number;
    };
}
interface OrderConfirmModalProps {
    isOpen: boolean;
    order: OrderDetails | null;
    onConfirm: () => void;
    onCancel: () => void;
    warnings?: string[];
    errors?: string[];
}
export default function OrderConfirmModal({ isOpen, order, onConfirm, onCancel, warnings, errors, }: OrderConfirmModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
