import type { RiskMetrics } from './TradeDashboard';
export type RiskPlanSummary = {
    symbol: string;
    direction: 'long' | 'short';
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskPerTrade: number;
    riskPercent: number;
    positionSize: number;
    riskReward: number;
};
type RiskManagerProps = {
    symbol: string;
    currentPrice: number;
    atr: number;
    portfolioValue: number;
    balance: {
        cash: number;
        buyingPower: number;
        portfolioValue: number;
    };
    riskMetrics: RiskMetrics;
    openPositions: Array<{
        symbol: string;
        unrealizedPnL: number;
    }>;
    onApplyPlan?: (plan: RiskPlanSummary) => void;
};
export default function RiskManager({ symbol, currentPrice, atr, portfolioValue, balance, riskMetrics, openPositions, onApplyPlan, }: RiskManagerProps): import("react/jsx-runtime").JSX.Element;
export {};
