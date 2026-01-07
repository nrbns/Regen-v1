/**
 * Trade Signal Generator with Fallback
 * Phase 1, Day 7: Trade Mode Stability
 */

import type { TradeSignal } from '../../services/realtime/tradeSignalService';

export interface SignalGeneratorConfig {
  enableFallback: boolean;
  fallbackInterval: number; // ms
  minConfidence: number;
}

/**
 * Phase 1, Day 7: Generate fallback signals when WebSocket is unavailable
 */
export function generateFallbackSignal(
  symbol: string,
  price: number,
  previousPrice: number | null,
  volume?: number
): TradeSignal | null {
  if (previousPrice === null) {
    return null;
  }

  const priceChange = price - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  // Simple signal generation based on price movement
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let confidence = 0.5;
  let reason = '';

  // Strong upward movement
  if (priceChangePercent > 1) {
    action = 'BUY';
    confidence = Math.min(0.9, 0.5 + priceChangePercent / 10);
    reason = `Strong upward momentum (+${priceChangePercent.toFixed(2)}%)`;
  }
  // Strong downward movement
  else if (priceChangePercent < -1) {
    action = 'SELL';
    confidence = Math.min(0.9, 0.5 + Math.abs(priceChangePercent) / 10);
    reason = `Strong downward momentum (${priceChangePercent.toFixed(2)}%)`;
  }
  // Moderate movement
  else if (priceChangePercent > 0.5) {
    action = 'BUY';
    confidence = 0.6;
    reason = `Moderate upward movement (+${priceChangePercent.toFixed(2)}%)`;
  } else if (priceChangePercent < -0.5) {
    action = 'SELL';
    confidence = 0.6;
    reason = `Moderate downward movement (${priceChangePercent.toFixed(2)}%)`;
  } else {
    action = 'HOLD';
    confidence = 0.7;
    reason = 'Price movement within normal range';
  }

  // Adjust confidence based on volume (if available)
  if (volume && volume > 1000000) {
    confidence = Math.min(0.95, confidence + 0.1);
    reason += ' (high volume)';
  }

  return {
    symbol,
    action,
    confidence,
    reason,
    timestamp: Date.now(),
  };
}

/**
 * Phase 1, Day 7: Validate signal before displaying
 */
export function validateSignal(signal: TradeSignal, config: SignalGeneratorConfig): {
  valid: boolean;
  shouldDisplay: boolean;
  reason?: string;
} {
  if (!signal || !signal.symbol) {
    return { valid: false, shouldDisplay: false, reason: 'Invalid signal data' };
  }

  if (signal.confidence < config.minConfidence) {
    return {
      valid: true,
      shouldDisplay: false,
      reason: `Confidence too low (${(signal.confidence * 100).toFixed(0)}% < ${(config.minConfidence * 100).toFixed(0)}%)`,
    };
  }

  if (signal.action === 'HOLD') {
    return { valid: true, shouldDisplay: false, reason: 'HOLD signals are not displayed' };
  }

  // Check if signal is too old (more than 5 minutes)
  const signalAge = Date.now() - signal.timestamp;
  if (signalAge > 5 * 60 * 1000) {
    return { valid: true, shouldDisplay: false, reason: 'Signal is too old' };
  }

  return { valid: true, shouldDisplay: true };
}

