const CACHE_TTL = 60 * 1000; // 60s cache
const MAX_RESULTS = 8;

export type SymbolResult = {
  symbol: string;
  name: string;
  exchange: string;
  region?: string;
  currency?: string;
  type: 'stock' | 'crypto' | 'fund' | 'forex' | 'other';
};

type CacheEntry = {
  expiresAt: number;
  results: SymbolResult[];
};

const cache = new Map<string, CacheEntry>();

const FALLBACK_RESULTS: SymbolResult[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    exchange: 'NASDAQ',
    region: 'US',
    currency: 'USD',
    type: 'stock',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    region: 'US',
    currency: 'USD',
    type: 'stock',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc',
    exchange: 'NASDAQ',
    region: 'US',
    currency: 'USD',
    type: 'stock',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    region: 'US',
    currency: 'USD',
    type: 'stock',
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin USD',
    exchange: 'CRYPTO',
    region: 'US',
    currency: 'USD',
    type: 'crypto',
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum USD',
    exchange: 'CRYPTO',
    region: 'US',
    currency: 'USD',
    type: 'crypto',
  },
];

export async function searchTradingSymbols(query: string): Promise<SymbolResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return FALLBACK_RESULTS.slice(0, 4);
  }

  const lower = trimmed.toLowerCase();
  const cached = cache.get(lower);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.results;
  }

  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', trimmed);
    url.searchParams.set('quotesCount', MAX_RESULTS.toString());
    url.searchParams.set('enableTrivialUpdate', 'true');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Symbol search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { quotes?: Array<Record<string, any>> };
    const results = payload.quotes
      ?.slice(0, MAX_RESULTS)
      .map(quote => mapYahooQuoteToResult(quote))
      .filter(Boolean) as SymbolResult[] | undefined;

    if (results && results.length > 0) {
      cache.set(lower, { expiresAt: now + CACHE_TTL, results });
      return results;
    }
  } catch (error) {
    console.warn('[SymbolSearch] Remote search failed, falling back to local list:', error);
  }

  const fallbackMatches = FALLBACK_RESULTS.filter(
    item => item.symbol.toLowerCase().startsWith(lower) || item.name.toLowerCase().includes(lower)
  );
  cache.set(lower, { expiresAt: now + CACHE_TTL, results: fallbackMatches });
  return fallbackMatches;
}

function mapYahooQuoteToResult(quote: Record<string, any>): SymbolResult | null {
  if (!quote?.symbol || !quote?.shortname) {
    return null;
  }

  const type = inferInstrumentType(quote);
  return {
    symbol: quote.symbol,
    name: quote.shortname,
    exchange: quote.exchange || quote.exchDisp || 'UNKNOWN',
    region: quote.region || quote.exchangeTimezoneName,
    currency: quote.currency || quote.quoteType === 'CRYPTOCURRENCY' ? 'USD' : undefined,
    type,
  };
}

function inferInstrumentType(quote: Record<string, any>): SymbolResult['type'] {
  const quoteType = (quote.quoteType || '').toLowerCase();
  if (quoteType === 'cryptocurrency') return 'crypto';
  if (quoteType === 'etf') return 'fund';
  if (quoteType === 'forexpair') return 'forex';
  if (quoteType.includes('equity') || quoteType === 'stock') return 'stock';
  return 'other';
}
