const API_BASE = import.meta.env.VITE_TRADE_API_BASE || 'https://www.alphavantage.co/query';
const API_KEY = import.meta.env.VITE_TRADE_API_KEY || 'demo';

export interface TradeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  volume?: number;
  updatedAt: number;
  sparkline: number[];
  sentiment?: 'bullish' | 'neutral' | 'bearish';
}

export async function fetchTradeQuote(symbol: string): Promise<TradeQuote> {
  try {
    const url = `${API_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Trade API error: ${response.statusText}`);
    }
    const data = await response.json();
    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('No quote data returned');
    }

    const price = Number.parseFloat(quote['05. price']);
    const previousClose = Number.parseFloat(quote['08. previous close']);
    const change = Number.parseFloat(quote['09. change']);
    const changePercent = Number.parseFloat((quote['10. change percent'] || '0%').replace('%', ''));
    const volume = Number.parseFloat(quote['06. volume']);

    return {
      symbol: quote['01. symbol'] || symbol,
      price,
      change,
      changePercent,
      previousClose,
      volume,
      updatedAt: Date.now(),
      sparkline: generateSparkline(price, change),
      sentiment: determineSentiment(changePercent),
    };
  } catch (error) {
    console.warn('[TradeData] Falling back to synthetic quote:', error);
    return createSyntheticQuote(symbol);
  }
}

function generateSparkline(price: number, change: number): number[] {
  const points = 20;
  const base = price - change;
  const spark: number[] = [];
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * (Math.abs(change) * 0.1);
    spark.push(Math.max(base * 0.9, price + noise - change * ((points - i) / points)));
  }
  return spark;
}

function determineSentiment(changePercent: number): 'bullish' | 'neutral' | 'bearish' {
  if (changePercent > 1) return 'bullish';
  if (changePercent < -1) return 'bearish';
  return 'neutral';
}

function createSyntheticQuote(symbol: string): TradeQuote {
  const price = 100 + Math.random() * 50;
  const changePercent = (Math.random() - 0.5) * 4;
  const change = (price * changePercent) / 100;
  return {
    symbol,
    price,
    change,
    changePercent,
    previousClose: price - change,
    volume: Math.round(1_000_000 + Math.random() * 5_000_000),
    updatedAt: Date.now(),
    sparkline: generateSparkline(price, change),
    sentiment: determineSentiment(changePercent),
  };
}

