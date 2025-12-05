/**
 * Market Data Feed Processor
 * Real-time market data streaming (OHLC, Orderbook, Trades)
 */

const EventEmitter = require('events');
const axios = require('axios');
const WebSocket = require('ws');
const Pino = require('pino');
const { streamFetch, createDebouncedFetch } = require('../../utils/stream-fetch.cjs');

const logger = Pino({ name: 'market-feed' });

// PERFORMANCE FIX #3: Debounced fetch for Trade data (300ms debounce)
const debouncedFetch = createDebouncedFetch(300);

class MarketFeed extends EventEmitter {
  constructor() {
    super();
    this.symbols = new Set();
    this.subscriptions = new Map(); // symbol -> subscription
    this.historicalCache = new Map(); // symbol -> OHLC data
    this.orderbookCache = new Map(); // symbol -> orderbook
    this.priceCache = new Map(); // symbol -> latest price
    this.isRunning = false;
    this.updateInterval = null;
    this.ws = null; // WebSocket connection
    this.reconnectTimeout = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize feed (mock or real provider)
   */
  async initialize() {
    this.provider = process.env.MARKET_DATA_PROVIDER || 'mock';
    
    if (this.provider === 'mock') {
      logger.info('Using mock market data provider');
      this._startMockFeed();
    } else if (this.provider === 'binance') {
      logger.info('Using Binance market data provider');
      await this._startBinanceFeed();
    } else if (this.provider === 'alpaca') {
      logger.info('Using Alpaca market data provider');
      // TODO: Implement Alpaca WebSocket
      logger.warn('Alpaca provider not yet implemented, falling back to mock');
      this._startMockFeed();
    }

    this.isRunning = true;
  }

  /**
   * Start Binance WebSocket feed
   */
  async _startBinanceFeed() {
    const wsUrl = process.env.BINANCE_WS_URL || 'wss://stream.binance.com:9443/ws';
    const apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3';
    
    try {
      // Connect to Binance WebSocket
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        logger.info('Binance WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Subscribe to all symbols
        if (this.symbols.size > 0) {
          this._subscribeBinanceSymbols();
        }
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this._handleBinanceMessage(message);
        } catch (error) {
          logger.error({ error: error.message }, 'Error parsing Binance message');
        }
      });

      this.ws.on('error', (error) => {
        logger.error({ error: error.message }, 'Binance WebSocket error');
      });

      this.ws.on('close', () => {
        logger.warn('Binance WebSocket closed');
        this._reconnectBinance();
      });

      // Fetch initial historical data from REST API
      await this._fetchBinanceHistorical();
      
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to start Binance feed');
      // Fallback to mock
      logger.warn('Falling back to mock feed');
      this._startMockFeed();
    }
  }

  /**
   * Subscribe to Binance symbols
   */
  _subscribeBinanceSymbols() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const streams = [];
    for (const symbol of this.symbols) {
      const binanceSymbol = this._normalizeSymbol(symbol);
      // Subscribe to ticker, depth, and trades
      streams.push(`${binanceSymbol.toLowerCase()}@ticker`);
      streams.push(`${binanceSymbol.toLowerCase()}@depth20@100ms`);
      streams.push(`${binanceSymbol.toLowerCase()}@trade`);
    }

    if (streams.length > 0) {
      // Use combined stream endpoint
      const streamUrl = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
      
      // Close old connection and open new one with streams
      if (this.ws) {
        this.ws.close();
      }
      
      this.ws = new WebSocket(streamUrl);
      this._setupBinanceHandlers();
    }
  }

  /**
   * Setup Binance WebSocket handlers
   */
  _setupBinanceHandlers() {
    if (!this.ws) return;

    this.ws.on('open', () => {
      logger.info('Binance stream WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this._handleBinanceStreamMessage(message);
      } catch (error) {
        logger.error({ error: error.message }, 'Error parsing Binance stream message');
      }
    });

    this.ws.on('error', (error) => {
      logger.error({ error: error.message }, 'Binance stream WebSocket error');
    });

    this.ws.on('close', () => {
      logger.warn('Binance stream WebSocket closed');
      this._reconnectBinance();
    });
  }

  /**
   * Handle Binance stream message (combined stream format)
   */
  _handleBinanceStreamMessage(message) {
    if (message.stream && message.data) {
      const stream = message.stream;
      const data = message.data;

      if (stream.includes('@ticker')) {
        this._handleBinanceTicker(data);
      } else if (stream.includes('@depth')) {
        this._handleBinanceDepth(data);
      } else if (stream.includes('@trade')) {
        this._handleBinanceTrade(data);
      }
    }
  }

  /**
   * Handle Binance ticker update
   */
  _handleBinanceTicker(data) {
    const symbol = this._denormalizeSymbol(data.s);
    const price = parseFloat(data.c);
    const timestamp = data.E;

    this.priceCache.set(symbol, price);

    const ohlc = {
      symbol,
      timestamp,
      open: parseFloat(data.o),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      close: price,
      volume: parseFloat(data.v),
    };

    this.historicalCache.set(symbol, ohlc);
    this.emit('ohlc', ohlc);
  }

  /**
   * Handle Binance orderbook depth update
   */
  _handleBinanceDepth(data) {
    const symbol = this._denormalizeSymbol(data.s);
    const timestamp = data.E || Date.now();

    const bids = data.b.map(([price, size]) => ({
      price: parseFloat(price),
      size: parseFloat(size),
    }));

    const asks = data.a.map(([price, size]) => ({
      price: parseFloat(price),
      size: parseFloat(size),
    }));

    const orderbook = {
      symbol,
      timestamp,
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
    };

    this.orderbookCache.set(symbol, orderbook);
    this.emit('orderbook', orderbook);
  }

  /**
   * Handle Binance trade update
   */
  _handleBinanceTrade(data) {
    const symbol = this._denormalizeSymbol(data.s);
    const trade = {
      symbol,
      timestamp: data.T,
      price: parseFloat(data.p),
      size: parseFloat(data.q),
      side: data.m ? 'sell' : 'buy', // m=true means buyer is maker (sell)
    };

    this.emit('trade', trade);
  }

  /**
   * Handle Binance message (legacy format)
   */
  _handleBinanceMessage(message) {
    // Handle different message types
    if (message.e === '24hrTicker') {
      this._handleBinanceTicker(message);
    } else if (message.e === 'depthUpdate') {
      this._handleBinanceDepth(message);
    } else if (message.e === 'trade') {
      this._handleBinanceTrade(message);
    }
  }

  /**
   * Fetch historical data from Binance REST API
   * PERFORMANCE FIX #3: Use streaming fetch with debounce
   */
  async _fetchBinanceHistorical() {
    const apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3';
    
    for (const symbol of this.symbols) {
      try {
        const binanceSymbol = this._normalizeSymbol(symbol);
        // PERFORMANCE FIX #3: Use debounced streaming fetch
        const url = `${apiUrl}/klines?symbol=${binanceSymbol}&interval=1h&limit=2000`;
        const responseText = await debouncedFetch(url, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        const response = { data: JSON.parse(responseText) };

        const klines = response.data.map(k => ({
          symbol,
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));

        if (klines.length > 0) {
          this.historicalCache.set(symbol, klines[klines.length - 1]);
          // Emit all historical data
          klines.forEach(ohlc => this.emit('ohlc', ohlc));
        }
      } catch (error) {
        logger.error({ symbol, error: error.message }, 'Failed to fetch Binance historical data');
      }
    }
  }

  /**
   * Reconnect to Binance WebSocket
   */
  _reconnectBinance() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached, falling back to mock feed');
      this._startMockFeed();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    logger.info({ attempt: this.reconnectAttempts, delay }, 'Reconnecting to Binance...');
    
    this.reconnectTimeout = setTimeout(() => {
      this._startBinanceFeed().catch(error => {
        logger.error({ error: error.message }, 'Reconnection failed');
      });
    }, delay);
  }

  /**
   * Normalize symbol to Binance format (e.g., BTCUSDT)
   */
  _normalizeSymbol(symbol) {
    // Handle different symbol formats
    // NSE:RELIANCE -> RELIANCE (not supported by Binance, return as-is for crypto)
    // BINANCE:BTCUSDT -> BTCUSDT
    // SP:SPX -> SPX (not supported, return as-is)
    
    if (symbol.includes(':')) {
      const [exchange, sym] = symbol.split(':');
      if (exchange.toUpperCase() === 'BINANCE') {
        return sym.toUpperCase();
      }
      // For non-Binance symbols, return original (will fail gracefully)
      return sym.toUpperCase();
    }
    
    // Assume crypto symbol (e.g., BTCUSDT)
    return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Denormalize Binance symbol back to our format
   */
  _denormalizeSymbol(binanceSymbol) {
    // Try to find original symbol format
    for (const symbol of this.symbols) {
      if (this._normalizeSymbol(symbol) === binanceSymbol) {
        return symbol;
      }
    }
    // Return as BINANCE:SYMBOL format
    return `BINANCE:${binanceSymbol}`;
  }

  /**
   * Start mock feed (for development/testing)
   */
  _startMockFeed() {
    this.updateInterval = setInterval(() => {
      for (const symbol of this.symbols) {
        this._generateMockData(symbol);
      }
    }, 1000); // Update every second
  }

  /**
   * Generate mock market data
   */
  _generateMockData(symbol) {
    const basePrice = this.priceCache.get(symbol) || 50000;
    const change = (Math.random() - 0.5) * 100; // Random change
    const newPrice = Math.max(100, basePrice + change);
    this.priceCache.set(symbol, newPrice);

    const timestamp = Date.now();
    const ohlc = {
      symbol,
      timestamp,
      open: basePrice,
      high: newPrice * 1.01,
      low: newPrice * 0.99,
      close: newPrice,
      volume: Math.random() * 1000,
    };

    this.historicalCache.set(symbol, ohlc);
    this.emit('ohlc', ohlc);

    // Generate orderbook
    const orderbook = this._generateMockOrderbook(symbol, newPrice);
    this.orderbookCache.set(symbol, orderbook);
    this.emit('orderbook', orderbook);

    // Generate trade
    const trade = {
      symbol,
      timestamp,
      price: newPrice,
      size: Math.random() * 10,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
    };
    this.emit('trade', trade);
  }

  /**
   * Generate mock orderbook
   */
  _generateMockOrderbook(symbol, price) {
    const bids = [];
    const asks = [];

    for (let i = 0; i < 10; i++) {
      bids.push({
        price: price * (1 - (i + 1) * 0.001),
        size: Math.random() * 100,
      });
      asks.push({
        price: price * (1 + (i + 1) * 0.001),
        size: Math.random() * 100,
      });
    }

    return {
      symbol,
      timestamp: Date.now(),
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
    };
  }

  /**
   * Subscribe to symbol
   */
  subscribe(symbol) {
    this.symbols.add(symbol);
    logger.info({ symbol }, 'Subscribed to symbol');
    this.emit('subscribed', symbol);
    
    // For Binance, subscribe to WebSocket streams
    if (this.provider === 'binance' && this.ws) {
      this._subscribeBinanceSymbols();
      // Fetch historical data
      this._fetchBinanceHistorical().catch(error => {
        logger.error({ symbol, error: error.message }, 'Failed to fetch historical data');
      });
    }
    
    // Send initial data if available
    if (this.historicalCache.has(symbol)) {
      this.emit('ohlc', this.historicalCache.get(symbol));
    }
    if (this.orderbookCache.has(symbol)) {
      this.emit('orderbook', this.orderbookCache.get(symbol));
    }
  }

  /**
   * Unsubscribe from symbol
   */
  unsubscribe(symbol) {
    this.symbols.delete(symbol);
    logger.info({ symbol }, 'Unsubscribed from symbol');
    this.emit('unsubscribed', symbol);
  }

  /**
   * Get historical OHLC data
   */
  async getHistorical(symbol, timeframe = '1h', limit = 2000) {
    // Check cache first
    if (this.historicalCache.has(symbol)) {
      return [this.historicalCache.get(symbol)];
    }

    // For mock, generate historical data
    if (this.provider === 'mock') {
      return this._generateHistoricalData(symbol, timeframe, limit);
    }

    // For Binance, fetch from REST API
    // PERFORMANCE FIX #3: Use streaming fetch with debounce
    if (this.provider === 'binance') {
      try {
        const apiUrl = process.env.BINANCE_API_URL || 'https://api.binance.com/api/v3';
        const binanceSymbol = this._normalizeSymbol(symbol);
        const interval = this._getBinanceInterval(timeframe);
        
        const url = `${apiUrl}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        const responseText = await debouncedFetch(url, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          },
        });
        
        const response = { data: JSON.parse(responseText) };
        });

        const klines = response.data.map(k => ({
          symbol,
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));

        // Cache the latest
        if (klines.length > 0) {
          this.historicalCache.set(symbol, klines[klines.length - 1]);
        }

        return klines;
      } catch (error) {
        logger.error({ symbol, error: error.message }, 'Failed to fetch Binance historical data');
        // Fallback to mock
        return this._generateHistoricalData(symbol, timeframe, limit);
      }
    }

    return [];
  }

  /**
   * Get Binance interval from timeframe
   */
  _getBinanceInterval(timeframe) {
    const intervals = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };
    return intervals[timeframe] || '1h';
  }

  /**
   * Generate historical data (mock)
   */
  _generateHistoricalData(symbol, timeframe, limit) {
    const data = [];
    const basePrice = 50000;
    const now = Date.now();
    const interval = this._getTimeframeMs(timeframe);

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const change = (Math.random() - 0.5) * 1000;
      const price = basePrice + change;

      data.push({
        symbol,
        timestamp,
        open: price,
        high: price * 1.02,
        low: price * 0.98,
        close: price + (Math.random() - 0.5) * 100,
        volume: Math.random() * 1000,
      });
    }

    return data;
  }

  /**
   * Get timeframe in milliseconds
   */
  _getTimeframeMs(timeframe) {
    const units = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return units[timeframe] || 60 * 60 * 1000;
  }

  /**
   * Get current orderbook
   */
  getOrderbook(symbol) {
    return this.orderbookCache.get(symbol) || null;
  }

  /**
   * Get latest price
   */
  getPrice(symbol) {
    const ohlc = this.historicalCache.get(symbol);
    return ohlc ? ohlc.close : null;
  }

  /**
   * Stop feed
   */
  stop() {
    this.isRunning = false;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.symbols.clear();
    logger.info('Market feed stopped');
  }
}

// Singleton instance
let marketFeedInstance = null;

function getMarketFeed() {
  if (!marketFeedInstance) {
    marketFeedInstance = new MarketFeed();
    marketFeedInstance.initialize().catch(err => {
      logger.error({ error: err.message }, 'Market feed initialization failed');
    });
  }
  return marketFeedInstance;
}

module.exports = { MarketFeed, getMarketFeed };

