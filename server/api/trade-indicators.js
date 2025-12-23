/**
 * Trade Indicators API
 * Provides technical indicator calculations for TradingView-like features
 */

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) {
    return [];
  }

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.map(c => (c > 0 ? c : 0));
  const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));

  const rsi = [];
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
export function calculateSMA(prices, period) {
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  const ema = [];

  const initialSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(initialSMA);

  for (let i = period; i < prices.length; i++) {
    const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(value);
  }

  return ema;
}

/**
 * Calculate MACD
 */
export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const minLength = Math.min(fastEMA.length, slowEMA.length);
  const macdLine = [];

  for (let i = 0; i < minLength; i++) {
    const fastIdx = fastEMA.length - minLength + i;
    const slowIdx = slowEMA.length - minLength + i;
    macdLine.push(fastEMA[fastIdx] - slowEMA[slowIdx]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = [];

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
export function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const middle = calculateSMA(prices, period);
  const upper = [];
  const lower = [];

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

/**
 * POST /api/trade/indicators
 * Calculate technical indicators for a symbol
 */
export async function calculateIndicators(req, reply) {
  try {
    const { symbol, candles, indicators = [] } = req.body;

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return reply.code(400).send({ error: 'Invalid candles data' });
    }

    const closes = candles.map(c => c.close || c[4]);
    const results = {};

    for (const indicator of indicators) {
      const { type, period = 14 } = indicator;

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
        default:
          // Unknown indicator type
          break;
      }
    }

    return reply.send({
      symbol,
      indicators: results,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('[TradeIndicators] Error calculating indicators:', error);
    return reply.code(500).send({
      error: 'Failed to calculate indicators',
      message: error.message,
    });
  }
}
