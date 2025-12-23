/**
 * ChartTypeSelector - TradingView-style chart type selector
 * Supports Candlestick, Line, Area, Heikin Ashi, etc.
 */

import { BarChart3, TrendingUp, Activity, Layers } from 'lucide-react';

export type ChartType = 'candlestick' | 'line' | 'area' | 'heikinashi' | 'ohlc';

export interface ChartTypeOption {
  type: ChartType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

export const CHART_TYPES: ChartTypeOption[] = [
  {
    type: 'candlestick',
    name: 'Candlestick',
    icon: BarChart3,
    description: 'Traditional candlestick chart',
  },
  {
    type: 'line',
    name: 'Line',
    icon: TrendingUp,
    description: 'Simple line chart',
  },
  {
    type: 'area',
    name: 'Area',
    icon: Layers,
    description: 'Filled area chart',
  },
  {
    type: 'heikinashi',
    name: 'Heikin Ashi',
    icon: Activity,
    description: 'Smooth candlestick variant',
  },
  {
    type: 'ohlc',
    name: 'OHLC',
    icon: BarChart3,
    description: 'Open-High-Low-Close bars',
  },
];

interface ChartTypeSelectorProps {
  selectedType: ChartType;
  onTypeChange: (type: ChartType) => void;
  className?: string;
}

export function ChartTypeSelector({
  selectedType,
  onTypeChange,
  className = '',
}: ChartTypeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-400">Chart Type:</span>
      <div className="flex gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 p-1">
        {CHART_TYPES.map(option => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          return (
            <button
              key={option.type}
              onClick={() => onTypeChange(option.type)}
              title={option.description}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition ${
                isSelected
                  ? 'border border-blue-500/40 bg-blue-500/20 text-blue-300'
                  : 'text-gray-400 hover:bg-slate-700/50 hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{option.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Convert Heikin Ashi data
 */
export function convertToHeikinAshi(
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>
): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}> {
  if (candles.length === 0) return [];

  const haCandles = [];
  let prevHA = {
    open: candles[0].open,
    close: candles[0].close,
  };

  for (const candle of candles) {
    const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
    const haOpen = (prevHA.open + prevHA.close) / 2;
    const haHigh = Math.max(candle.high, haOpen, haClose);
    const haLow = Math.min(candle.low, haOpen, haClose);

    haCandles.push({
      time: candle.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    });

    prevHA = { open: haOpen, close: haClose };
  }

  return haCandles;
}
