export interface AISignal {
    id: string;
    symbol: string;
    action: 'buy' | 'sell' | 'hold' | 'close';
    confidence: number;
    entryPrice: number;
    stopLoss?: number;
    takeProfit?: number;
    positionSize: number;
    rationale: string;
    contributingFactors: Array<{
        factor: string;
        weight: number;
        value: number;
        impact: 'positive' | 'negative' | 'neutral';
        description: string;
    }>;
    modelVersion: string;
    generatedAt: string;
    expiresAt: string;
    riskMetrics?: {
        maxLoss: number;
        maxGain: number;
        riskRewardRatio: number;
        winProbability: number;
        portfolioRiskPercent: number;
    };
}
interface AISignalPanelProps {
    symbol: string;
    signal?: AISignal;
    onApplySignal?: (signal: AISignal) => void;
    onGenerateSignal?: (symbol: string) => void;
    isLoading?: boolean;
}
export default function AISignalPanel({ symbol, signal, onApplySignal, onGenerateSignal, isLoading, }: AISignalPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
