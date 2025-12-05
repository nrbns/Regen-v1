import type { IndicatorConfig } from './TradingViewChart';
type IndicatorsProps = {
    indicators: IndicatorConfig[];
    onToggle: (id: string) => void;
    onUpdate: (id: string, updates: Partial<IndicatorConfig>) => void;
};
export default function Indicators({ indicators, onToggle, onUpdate }: IndicatorsProps): import("react/jsx-runtime").JSX.Element;
export {};
