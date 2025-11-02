/**
 * TradeAgent - Mode-specific agent for Trade mode
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface TradePosition {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  timestamp: number;
}

export interface TechnicalIndicator {
  type: 'rsi' | 'macd' | 'bollinger' | 'sma';
  value: number;
  signal?: 'buy' | 'sell' | 'hold';
}

export class TradeAgent {
  /**
   * Analyze technical indicators
   */
  async analyzeTechnical(symbol: string, priceData: number[]): Promise<TechnicalIndicator[]> {
    // Simple technical analysis (mock implementation)
    const indicators: TechnicalIndicator[] = [];

    if (priceData.length >= 14) {
      // RSI calculation (simplified)
      const rsi = this.calculateRSI(priceData);
      indicators.push({
        type: 'rsi',
        value: rsi,
        signal: rsi > 70 ? 'sell' : rsi < 30 ? 'buy' : 'hold',
      });
    }

    return indicators;
  }

  /**
   * Journal trade position
   */
  async journalPosition(position: TradePosition, notes?: string): Promise<void> {
    // Store position in local storage
    const positions = this.getPositions();
    const positionWithNotes = {
      ...position,
      ...(notes ? { notes } : {}),
    };
    positions.push(positionWithNotes as TradePosition & { notes?: string });
    // Save to storage (implementation would persist to file/db)
  }

  /**
   * Analyze sentiment from news/text
   */
  async analyzeSentiment(text: string): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number }> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      return { sentiment: 'neutral', score: 0 };
    }

    try {
      const response = await ollama.chat([
        {
          role: 'system',
          content: 'Analyze sentiment. Return JSON: {"sentiment": "positive|negative|neutral", "score": 0.0-1.0}',
        },
        {
          role: 'user',
          content: text,
        },
      ]);

      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]) as { sentiment: 'positive' | 'negative' | 'neutral'; score: number };
      }
    } catch {
      // Fallback
    }

    return { sentiment: 'neutral', score: 0 };
  }

  /**
   * Get all positions
   */
  getPositions(): TradePosition[] {
    // Load from storage
    return [];
  }

  /**
   * Calculate RSI (simplified)
   */
  private calculateRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
}

