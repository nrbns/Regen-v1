#!/usr/bin/env node
/**
 * Market Agent - Real-time market data streaming
 * Subscribes to market requests, streams price updates
 * PR: Market data agent
 */

const WebSocket = require('ws');

const BUS_URL = process.env.BUS_URL || 'ws://localhost:4002';
const REQUEST_CHANNEL = 'market.requests';
const UPDATE_CHANNEL_PREFIX = 'market.updates';

// Mock market data (replace with real exchange API)
const mockPrices = {
  'BTCUSDT': { price: 45000, change: 2.5, volume: 1000000 },
  'ETHUSDT': { price: 2800, change: -1.2, volume: 500000 },
  'NSE:NIFTY': { price: 25000, change: 0.8, volume: 2000000 },
  'SP:SPX': { price: 4500, change: 0.5, volume: 5000000 },
};

let ws = null;
let activeSubscriptions = new Map(); // symbol -> interval

/**
 * Connect to bus
 */
function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  console.log(`[MarketAgent] Connecting to bus: ${BUS_URL}`);

  ws = new WebSocket(BUS_URL);

  ws.on('open', () => {
    console.log('[MarketAgent] Connected to bus');

    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: REQUEST_CHANNEL,
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(message);
    } catch (error) {
      console.error('[MarketAgent] Message parse error:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('[MarketAgent] WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('[MarketAgent] Disconnected, reconnecting...');
    // Stop all subscriptions
    activeSubscriptions.forEach((interval) => clearInterval(interval));
    activeSubscriptions.clear();
    setTimeout(() => connect(), 3000);
  });
}

/**
 * Handle messages
 */
function handleMessage(message) {
  if (message.type === 'connected') {
    console.log(`[MarketAgent] Connected as ${message.clientId}`);
    return;
  }

  if (message.type === 'subscribed') {
    console.log(`[MarketAgent] Subscribed to ${message.channel}`);
    return;
  }

  if (message.type === 'message' && message.channel === REQUEST_CHANNEL) {
    handleMarketRequest(message.data);
  }
}

/**
 * Handle market request
 */
function handleMarketRequest(request) {
  const { symbol, action, subscriptionId } = request;

  if (action === 'subscribe') {
    subscribeToSymbol(symbol, subscriptionId);
  } else if (action === 'unsubscribe') {
    unsubscribeFromSymbol(symbol, subscriptionId);
  }
}

/**
 * Subscribe to symbol
 */
function subscribeToSymbol(symbol, subscriptionId) {
  if (activeSubscriptions.has(symbol)) {
    console.log(`[MarketAgent] Already subscribed to ${symbol}`);
    return;
  }

  console.log(`[MarketAgent] Subscribing to ${symbol}`);

  // Start streaming updates
  const interval = setInterval(() => {
    const update = generatePriceUpdate(symbol);
    publishUpdate(symbol, update);
  }, 1000); // Update every second

  activeSubscriptions.set(symbol, interval);

  // Send initial price
  const initialPrice = generatePriceUpdate(symbol);
  publishUpdate(symbol, initialPrice);
}

/**
 * Unsubscribe from symbol
 */
function unsubscribeFromSymbol(symbol, subscriptionId) {
  const interval = activeSubscriptions.get(symbol);
  if (interval) {
    clearInterval(interval);
    activeSubscriptions.delete(symbol);
    console.log(`[MarketAgent] Unsubscribed from ${symbol}`);
  }
}

/**
 * Generate price update (mock)
 */
function generatePriceUpdate(symbol) {
  const base = mockPrices[symbol] || { price: 100, change: 0, volume: 0 };
  
  // Simulate price movement
  const change = (Math.random() - 0.5) * 0.1; // ±0.05%
  const newPrice = base.price * (1 + change);
  const newChange = base.change + change;

  return {
    symbol,
    price: parseFloat(newPrice.toFixed(2)),
    change: parseFloat(newChange.toFixed(2)),
    changePercent: parseFloat(((newChange / base.price) * 100).toFixed(2)),
    volume: base.volume + Math.floor(Math.random() * 10000),
    timestamp: Date.now(),
  };
}

/**
 * Publish update
 */
function publishUpdate(symbol, update) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const channel = `${UPDATE_CHANNEL_PREFIX}.${symbol}`;
  ws.send(JSON.stringify({
    type: 'publish',
    channel,
    data: update,
  }));
}

/**
 * Start market agent
 */
console.log('📈 Market Agent starting...');
console.log(`📡 Bus URL: ${BUS_URL}`);
console.log(`📥 Subscribing to: ${REQUEST_CHANNEL}`);
console.log(`📤 Publishing to: ${UPDATE_CHANNEL_PREFIX}.*`);

connect();

// Cleanup on exit
process.on('SIGTERM', () => {
  console.log('[MarketAgent] Shutting down...');
  activeSubscriptions.forEach((interval) => clearInterval(interval));
  if (ws) {
    ws.close();
  }
  process.exit(0);
});

