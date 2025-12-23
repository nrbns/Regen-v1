/**
 * useTechnicalIndicators - Real-time technical indicators hook
 * Fetches and calculates indicators from backend or calculates locally
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../lib/env';
import {
  calculateRSI,
  calculateSMA,
  calculateEMA,
  calculateMACD,
  calculateBollingerBands,
} from '../components/trade/TechnicalIndicators';

export interface IndicatorData {
  rsi?: number[];
  sma?: number[];
  ema?: number[];
  macd?: { macd: number[]; signal: number[]; histogram: number[] };
  bollinger?: { upper: number[]; middle: number[]; lower: number[] };
  volume?: number[];
}

export function useTechnicalIndicators(
  candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>,
  enabledIndicators: Array<{ type: string; period?: number; [key: string]: any }>
) {
  const [indicatorData, setIndicatorData] = useState<IndicatorData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateIndicators = useCallback(async () => {
    if (!candles || candles.length === 0) {
      setIndicatorData({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try backend API first
      const _API_BASE = getApiBaseUrl();
      const closes = candles.map(c => c.close);

      // Calculate locally (always works, no backend dependency)
      const results: IndicatorData = {};

      for (const indicator of enabledIndicators) {
        const { type, period = 14 } = indicator;

        try {
          switch (type) {
            case 'rsi':
              results.rsi = calculateRSI(closes, period);
              break;
            case 'sma':
              results.sma = calculateSMA(closes, period);
              break;
            case 'ema':
              results.ema = calculateEMA(closes, period);
              break;
            case 'macd':
              results.macd = calculateMACD(
                closes,
                indicator.fastPeriod || 12,
                indicator.slowPeriod || 26,
                indicator.signalPeriod || 9
              );
              break;
            case 'bollinger':
              results.bollinger = calculateBollingerBands(closes, period, indicator.stdDev || 2);
              break;
            case 'volume':
              // Volume is already in candles (optional property)
              results.volume = candles.map(c => {
                const candle = c as any;
                return candle.volume !== undefined ? candle.volume : 0;
              });
              break;
          }
        } catch (calcError) {
          console.warn(`[useTechnicalIndicators] Failed to calculate ${type}:`, calcError);
        }
      }

      setIndicatorData(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate indicators';
      setError(errorMessage);
      console.error('[useTechnicalIndicators] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [candles, enabledIndicators]);

  useEffect(() => {
    if (candles.length > 0 && enabledIndicators.length > 0) {
      calculateIndicators();
    }
  }, [candles, enabledIndicators, calculateIndicators]);

  return { indicatorData, loading, error, recalculate: calculateIndicators };
}
