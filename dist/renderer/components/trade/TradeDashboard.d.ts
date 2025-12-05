export interface MarketSnapshot {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
}
export interface RiskMetrics {
    totalExposure: number;
    dailyPnL: number;
    marginUsed: number;
    marginAvailable: number;
    worstOpenTrade: number;
    maxDrawdown: number;
    portfolioValue: number;
    riskScore: number;
}
interface TradeDashboardProps {
    marketSnapshots: MarketSnapshot[];
    riskMetrics: RiskMetrics;
    onSymbolClick?: (symbol: string) => void;
}
export default function TradeDashboard({ marketSnapshots, riskMetrics, onSymbolClick }: TradeDashboardProps): import("react/jsx-runtime").JSX.Element;
export {};
