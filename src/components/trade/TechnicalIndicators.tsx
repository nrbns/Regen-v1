/**
 * TechnicalIndicators - TradingView-style indicator panel
 * Supports RSI, MACD, Bollinger Bands, Volume, etc.
 */

import { useState, useMemo } from 'react';
import { TrendingUp, BarChart3, Activity, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export type IndicatorType = 'rsi' | 'macd' | 'bollinger' | 'volume' | 'sma' | 'ema';

export interface Indicator {
  id: string;
  type: IndicatorType;
  name: string;
  enabled: boolean;
  color: string;
  period?: number;
}

interface TechnicalIndicatorsProps {
  indicators: Indicator[];
  onToggle: (indicatorId: string) => void;
  onAdd: (type: IndicatorType) => void;
  onRemove: (indicatorId: string) => void;
}

const INDICATOR_ICONS: Record<IndicatorType, React.ComponentType<any>> = {
  rsi: Activity,
  macd: TrendingUp,
  bollinger: Layers,
  volume: BarChart3,
  sma: TrendingUp,
  ema: TrendingUp,
};

const INDICATOR_COLORS: Record<IndicatorType, string> = {
  rsi: 'text-orange-400',
  macd: 'text-blue-400',
  bollinger: 'text-purple-400',
  volume: 'text-emerald-400',
  sma: 'text-yellow-400',
  ema: 'text-cyan-400',
};

const INDICATOR_NAMES: Record<IndicatorType, string> = {
  rsi: 'RSI',
  macd: 'MACD',
  bollinger: 'Bollinger Bands',
  volume: 'Volume',
  sma: 'SMA',
  ema: 'EMA',
};

export function TechnicalIndicators({
  indicators,
  onToggle,
  onAdd,
  onRemove,
}: TechnicalIndicatorsProps) {
  const [isOpen, setIsOpen] = useState(true);

  const availableIndicators = useMemo(() => {
    const usedTypes = new Set(indicators.map(i => i.type));
    return (Object.keys(INDICATOR_NAMES) as IndicatorType[]).filter(type => !usedTypes.has(type));
  }, [indicators]);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-3 flex w-full items-center justify-between text-sm font-medium text-gray-300 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <BarChart3 size={16} />
          Technical Indicators
        </span>
        <span className="text-xs text-gray-500">
          {indicators.filter(i => i.enabled).length} active
        </span>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          {/* Active Indicators */}
          {indicators.length > 0 && (
            <div className="space-y-2">
              {indicators.map(indicator => {
                const Icon = INDICATOR_ICONS[indicator.type];
                const colorClass = INDICATOR_COLORS[indicator.type];
                return (
                  <div
                    key={indicator.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-800/50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={colorClass} />
                      <span className="text-xs text-gray-200">{indicator.name}</span>
                      {indicator.period && (
                        <span className="text-xs text-gray-500">({indicator.period})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggle(indicator.id)}
                        className={`h-5 w-9 rounded-full transition-colors ${
                          indicator.enabled ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                            indicator.enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => onRemove(indicator.id)}
                        className="rounded p-1 text-gray-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Indicator */}
          {availableIndicators.length > 0 && (
            <div className="border-t border-slate-700/40 pt-3">
              <div className="mb-2 text-xs font-medium text-gray-400">Add Indicator</div>
              <div className="grid grid-cols-2 gap-2">
                {availableIndicators.map(type => {
                  const Icon = INDICATOR_ICONS[type];
                  const colorClass = INDICATOR_COLORS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => onAdd(type)}
                      className="flex items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-800/30 p-2 text-xs text-gray-300 transition hover:border-slate-600 hover:bg-slate-800/50"
                    >
                      <Icon size={14} className={colorClass} />
                      {INDICATOR_NAMES[type]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < changes.length; i++) {
    gains.push(changes[i] > 0 ? changes[i] : 0);
    losses.push(changes[i] < 0 ? Math.abs(changes[i]) : 0);
  }

  const rsi: number[] = [];

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // Start with SMA
  const initialSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(initialSMA);

  for (let i = period; i < prices.length; i++) {
    const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(value);
  }

  return ema;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // Align lengths
  const minLength = Math.min(fastEMA.length, slowEMA.length);
  const macdLine: number[] = [];

  for (let i = 0; i < minLength; i++) {
    const fastIdx = fastEMA.length - minLength + i;
    const slowIdx = slowEMA.length - minLength + i;
    macdLine.push(fastEMA[fastIdx] - slowEMA[slowIdx]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];

  for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
    histogram.push(macdLine[macdLine.length - signalLine.length + i] - signalLine[i]);
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const avg = middle[middle.length - (prices.length - i)];
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / period;
    const std = Math.sqrt(variance);

    upper.push(avg + stdDev * std);
    lower.push(avg - stdDev * std);
  }

  return { upper, middle, lower };
}
