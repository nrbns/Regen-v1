export interface CandleData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
interface TradingChartProps {
    symbol: string;
    timeframe: string;
    data?: CandleData[];
    onTimeframeChange?: (timeframe: string) => void;
    height?: number;
}
export default function TradingChart({ symbol, timeframe, data, onTimeframeChange, height }: TradingChartProps): import("react/jsx-runtime").JSX.Element;
export {};
