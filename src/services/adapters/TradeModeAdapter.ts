/**
 * Trade Mode Adapter
 *
 * Provides unified interface for:
 * - getPrice(symbol)
 * - getHistorical(symbol, timeframe)
 * - getMarketNews(symbol?)
 */

import { getApiClient } from '../externalApiClient';
import { useExternalApisStore } from '../../state/externalApisStore';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: number;
}

export interface HistoricalData {
  symbol: string;
  timeframe: string;
  data: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface MarketNews {
  title: string;
  source: string;
  url: string;
  publishedAt: number;
  summary?: string;
}

export class TradeModeAdapter {
  private client = getApiClient();

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<PriceData> {
    const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('trade');

    // Try CoinGecko first (no key, good for crypto)
    const coingecko = enabledApis.find(a => a.id === 'coingecko');
    if (coingecko) {
      try {
        const response = await this.client.request<{
          [key: string]: { usd: number; usd_24h_change: number };
        }>('coingecko', `/simple/price?ids=${symbol}&vs_currencies=usd&include_24hr_change=true`);
        const data = response.data[symbol];
        if (data) {
          return {
            symbol,
            price: data.usd,
            change: (data.usd * data.usd_24h_change) / 100,
            changePercent: data.usd_24h_change,
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.warn('[TradeAdapter] CoinGecko failed, trying fallback:', error);
      }
    }

    // Try Alpha Vantage (stocks)
    const alphaVantage = enabledApis.find(a => a.id === 'alpha_vantage');
    if (alphaVantage) {
      try {
        const response = await this.client.request<{
          'Global Quote': {
            '01. symbol': string;
            '05. price': string;
            '09. change': string;
            '10. change percent': string;
            '06. volume': string;
          };
        }>('alpha_vantage', `/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=DEMO`);

        const quote = response.data['Global Quote'];
        if (quote) {
          return {
            symbol: quote['01. symbol'],
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            volume: parseInt(quote['06. volume'], 10),
            timestamp: Date.now(),
          };
        }
      } catch (error) {
        console.warn('[TradeAdapter] Alpha Vantage failed, trying fallback:', error);
      }
    }

    // Try Binance (crypto)
    const binance = enabledApis.find(a => a.id === 'binance');
    if (binance) {
      try {
        const ticker = symbol.toUpperCase();
        const response = await this.client.request<{
          symbol: string;
          price: string;
          priceChange: string;
          priceChangePercent: string;
          volume: string;
        }>('binance', `/ticker/24hr?symbol=${ticker}USDT`);

        return {
          symbol: response.data.symbol,
          price: parseFloat(response.data.price),
          change: parseFloat(response.data.priceChange),
          changePercent: parseFloat(response.data.priceChangePercent),
          volume: parseFloat(response.data.volume),
          timestamp: Date.now(),
        };
      } catch (error) {
        console.warn('[TradeAdapter] Binance failed:', error);
      }
    }

    throw new Error(`Unable to fetch price for ${symbol} from any enabled API`);
  }

  /**
   * Get historical data for a symbol
   */
  async getHistorical(
    symbol: string,
    timeframe: '1d' | '1w' | '1m' | '1y' = '1d'
  ): Promise<HistoricalData> {
    const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('trade');

    // Try Finnhub (good for historical data)
    const finnhub = enabledApis.find(a => a.id === 'finnhub');
    if (finnhub) {
      try {
        const resolution = timeframe === '1d' ? 'D' : timeframe === '1w' ? 'W' : 'M';
        const to = Math.floor(Date.now() / 1000);
        const from =
          to -
          (timeframe === '1d'
            ? 86400
            : timeframe === '1w'
              ? 604800
              : timeframe === '1m'
                ? 2592000
                : 31536000);

        const response = await this.client.request<{
          c: number[];
          h: number[];
          l: number[];
          o: number[];
          t: number[];
          v: number[];
        }>(
          'finnhub',
          `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`
        );

        return {
          symbol,
          timeframe,
          data: response.data.t.map((timestamp, i) => ({
            timestamp: timestamp * 1000,
            open: response.data.o[i],
            high: response.data.h[i],
            low: response.data.l[i],
            close: response.data.c[i],
            volume: response.data.v[i],
          })),
        };
      } catch (error) {
        console.warn('[TradeAdapter] Finnhub historical failed:', error);
      }
    }

    throw new Error(`Unable to fetch historical data for ${symbol} from any enabled API`);
  }

  /**
   * Get market news
   */
  async getMarketNews(symbol?: string): Promise<MarketNews[]> {
    const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('trade');

    // Try Finnhub news
    const finnhub = enabledApis.find(a => a.id === 'finnhub');
    if (finnhub) {
      try {
        const endpoint = symbol
          ? `/company-news?symbol=${symbol}&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}`
          : `/news?category=general`;

        const response = await this.client.request<
          Array<{
            headline: string;
            source: string;
            url: string;
            datetime: number;
            summary?: string;
          }>
        >('finnhub', endpoint);

        return response.data.map(item => ({
          title: item.headline,
          source: item.source,
          url: item.url,
          publishedAt: item.datetime * 1000,
          summary: item.summary,
        }));
      } catch (error) {
        console.warn('[TradeAdapter] Finnhub news failed:', error);
      }
    }

    return [];
  }
}

/**
 * Get singleton TradeModeAdapter instance
 */
let tradeAdapterInstance: TradeModeAdapter | null = null;

export function getTradeAdapter(): TradeModeAdapter {
  if (!tradeAdapterInstance) {
    tradeAdapterInstance = new TradeModeAdapter();
  }
  return tradeAdapterInstance;
}
