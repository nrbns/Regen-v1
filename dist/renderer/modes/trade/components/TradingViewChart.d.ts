import type { CandleData } from '../../../components/trade/TradingChart';
type BaseIndicatorConfig = {
    id: string;
    label: string;
    color: string;
    enabled: boolean;
};
export type SmaIndicatorConfig = BaseIndicatorConfig & {
    type: 'sma';
    period: number;
};
export type EmaIndicatorConfig = BaseIndicatorConfig & {
    type: 'ema';
    period: number;
};
export type RsiIndicatorConfig = BaseIndicatorConfig & {
    type: 'rsi';
    period: number;
    upperBand?: number;
    lowerBand?: number;
};
export type MacdIndicatorConfig = BaseIndicatorConfig & {
    type: 'macd';
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    signalColor: string;
    histogramColor: string;
};
export type IndicatorConfig = SmaIndicatorConfig | EmaIndicatorConfig | RsiIndicatorConfig | MacdIndicatorConfig;
type TradingViewChartProps = {
    symbol: string;
    timeframe: string;
    data?: CandleData[];
    height?: number;
    indicatorConfig?: IndicatorConfig[];
};
export default function TradingViewChart({ symbol, timeframe, data, height, indicatorConfig, }: TradingViewChartProps): import("react/jsx-runtime").JSX.Element;
export {};
