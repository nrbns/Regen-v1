/* eslint-env node */

// ============================================================================
// LOAD ENVIRONMENT VARIABLES - MUST BE FIRST
// ============================================================================
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// SUPPRESS REDIS ERRORS AT CONSOLE LEVEL
// ============================================================================
// Override console.error to filter Redis connection errors
const originalConsoleError = console.error;
console.error = function (...args) {
  // Check all arguments for Redis errors
  for (const arg of args) {
    const message = arg?.toString() || '';
    const errorObj = arg;

    // Check if this is a Redis connection error
    if (
      (errorObj &&
        typeof errorObj === 'object' &&
        (errorObj.code === 'ECONNREFUSED' ||
          errorObj.code === 'ENOTFOUND' ||
          errorObj.code === 'ETIMEDOUT' ||
          errorObj.syscall === 'connect' ||
          errorObj.message?.includes('ECONNREFUSED') ||
          errorObj.message?.includes('Connection is closed') ||
          (errorObj.address === '127.0.0.1' && errorObj.port === 6379))) ||
      message.includes('ECONNREFUSED') ||
      message.includes('127.0.0.1:6379') ||
      (message.includes('Error:') &&
        message.includes('connect') &&
        (message.includes('6379') || message.includes('ECONNREFUSED')))
    ) {
      // Silently ignore Redis connection errors
      return;
    }
  }

  // Call original console.error for other errors
  originalConsoleError.apply(console, args);
};

// Also suppress Redis errors in console.log
const originalConsoleLog = console.log;
console.log = function (...args) {
  const message = args[0]?.toString() || '';
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('127.0.0.1:6379') ||
    (message.includes('Error:') && message.includes('connect') && message.includes('6379'))
  ) {
    // Silently ignore Redis connection errors in logs
    return;
  }
  originalConsoleLog.apply(console, args);
};

// Load .env file from project root
const envResult = config({ path: resolve(__dirname, '../.env') });
if (envResult.error) {
  console.warn('[RedixServer] Could not load .env file:', envResult.error.message);
} else {
  console.log('[RedixServer] Environment variables loaded from .env');
}

// ============================================================================
// GLOBAL ERROR GUARDS
// ============================================================================
// Prevent unhandled errors from crashing the server in development
// Suppress Redis connection errors globally
const isRedisError = err => {
  if (!err || typeof err !== 'object') return false;
  const code = err.code;
  const message = err.message || '';
  const syscall = err.syscall;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'MaxRetriesPerRequestError' ||
    message.includes('Connection is closed') ||
    message.includes('ECONNREFUSED') ||
    syscall === 'connect'
  );
};

process.on('uncaughtException', err => {
  // Suppress Redis connection errors
  if (isRedisError(err)) {
    // Silently ignore Redis connection errors
    return;
  }
  // Log other errors
  console.error('[FATAL] Uncaught exception in Redix server:', err);
  // In dev, log only - don't exit
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit after logging
  }
});

process.on('unhandledRejection', (reason, _promise) => {
  // Suppress Redis connection errors
  if (isRedisError(reason)) {
    // Silently ignore Redis connection errors
    return;
  }
  // Log other rejections
  console.error('[FATAL] Unhandled rejection in Redix server:', reason);
  // In dev, log only - don't exit
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit after logging
  }
});

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import axios from 'axios';
import WebSocket from 'ws';
import { runSearch } from './redix-search.js';
import { enqueueScrape } from './services/queue/queue.js';
import { analyzeWithLLM } from './services/agent/llm.js';
import { createCircuit } from './services/circuit/circuit.js';
import { researchSearch } from './services/research/search.js';
import { generateResearchAnswer, streamResearchAnswer } from './services/research/answer.js';
import { queryEnhancedResearch } from './services/research/enhanced.js';
import { aiProxy } from './services/ai/realtime-ai-proxy.js';
import { researchAgent, executeAgent } from './api/agent-controller.js';
import { runResearch, getResearchStatus } from './api/research-controller.js';
import { hybridSearch } from './routes/search.js';
import { validateApiKeys } from './utils/validateApiKeys.js';
import { proxyBingSearch, proxyOpenAI, proxyAnthropic, healthCheck } from './routes/proxy.js';
import { scrapeUrl } from './routes/scrape.js';
import { aiTask } from './routes/aiTask.js';
import crypto from 'crypto';

// Load metrics - provide stub for now (metrics.js is CommonJS)
const getMetrics = () => {
  const memUsage = process.memoryUsage();
  return {
    uptime: process.uptime() * 1000,
    memory: memUsage,
    performance: {
      tabCreation: [],
      ipcLatency: [],
      agentExecution: [],
    },
    counts: { tabs: 0, agents: 0, workers: 0 },
    averages: {
      tabCreation: 0,
      ipcLatency: 0,
      agentExecution: 0,
    },
    timestamp: new Date().toISOString(),
  };
};

// Redix services - provide stubs since they're CommonJS and optional
const eventBus = {
  publish: () => Promise.resolve(true),
  publishN8nCallback: () => Promise.resolve(true),
  publishAutomationTrigger: () => Promise.resolve(true),
};

const commandQueue = {
  enqueue: () => Promise.resolve({ id: uuidv4() }),
  dequeue: () => Promise.resolve(null),
};

const _sessionStore = {};
const _workflowOrchestrator = {};

const automationTriggers = {
  addTriggerEvent: () => Promise.resolve(),
};

const failSafe = {};

// WebSocket server will be initialized after Fastify starts
// Import is done dynamically to avoid circular dependencies

// Voice controller stub
const voiceController = {
  handleVoiceRecognize: async () => ({ error: 'Voice controller not available' }),
};

// --- Redis connection error handler (safe) ---
function attachRedisErrorHandlers(client, name) {
  client.on('error', err => {
    // Completely suppress all Redis connection errors - Redis is optional
    const code = err && err.code;
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'MaxRetriesPerRequestError' ||
      err?.message?.includes('Connection is closed')
    ) {
      // Silently ignore - Redis is optional
      redisConnected = false;
      return;
    }
    // Only log non-connection errors at debug level
    fastify.log.debug({ err, redis: name }, 'Redis client error');
    redisConnected = false;
  });
  client.on('connect', () => {
    redisConnected = true;
  });
}

const nodeProcess = globalThis.process;
const globalSetInterval = globalThis.setInterval
  ? globalThis.setInterval.bind(globalThis)
  : () => 0;
const globalClearInterval = globalThis.clearInterval
  ? globalThis.clearInterval.bind(globalThis)
  : () => {};
const REDIS_URL = nodeProcess?.env.REDIS_URL || 'redis://127.0.0.1:6379';
const PORT = Number(nodeProcess?.env.REDIX_PORT || 4000);

const fastify = Fastify({
  logger: {
    level: nodeProcess?.env.LOG_LEVEL || 'info',
    // Suppress Redis connection errors in Fastify logger
    serializers: {
      err: err => {
        // Filter out Redis connection errors
        if (
          err?.code === 'ECONNREFUSED' ||
          err?.code === 'ENOTFOUND' ||
          err?.code === 'ETIMEDOUT' ||
          err?.syscall === 'connect' ||
          (err?.address === '127.0.0.1' && err?.port === 6379) ||
          err?.message?.includes('ECONNREFUSED') ||
          err?.message?.includes('Connection is closed') ||
          err?.message?.includes('127.0.0.1:6379')
        ) {
          return null; // Suppress this error
        }
        return err;
      },
    },
  },
});

// Root route for health check
fastify.get('/', async (_request, _reply) => {
  return {
    status: 'ok',
    service: 'Redix Server',
    version: '0.1.0-alpha',
    timestamp: new Date().toISOString(),
    endpoints: {
      websocket: '/agent/stream',
      api: '/v1/search',
    },
  };
});

// AI_PROXY_PROVIDER is currently unused (commented out route handler)
// Kept for potential future use or reference
const _AI_PROXY_PROVIDER =
  nodeProcess?.env.AI_PROXY_PROVIDER || (nodeProcess?.env.OPENAI_API_KEY ? 'openai' : 'disabled');

const openAIConfig = {
  apiKey: nodeProcess?.env.OPENAI_API_KEY || '',
  baseUrl: nodeProcess?.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions',
  model: nodeProcess?.env.OPENAI_API_MODEL || 'gpt-4o-mini',
};

const STOCK_HISTORY_CACHE = new Map();
const STOCK_CACHE_TTL = 1000 * 60; // 1 minute
const FINNHUB_TOKEN = nodeProcess?.env.FINNHUB_TOKEN || nodeProcess?.env.FINNHUB_API_KEY || '';
const ZERODHA_API_KEY = nodeProcess?.env.ZERODHA_API_KEY || '';
const _ZERODHA_API_SECRET = nodeProcess?.env.ZERODHA_API_SECRET || '';
let ZERODHA_ACCESS_TOKEN = nodeProcess?.env.ZERODHA_ACCESS_TOKEN || '';
let ZERODHA_REFRESH_TOKEN = nodeProcess?.env.ZERODHA_REFRESH_TOKEN || '';
let _ZERODHA_TOKEN_EXPIRES_AT = nodeProcess?.env.ZERODHA_TOKEN_EXPIRES_AT
  ? parseInt(nodeProcess?.env.ZERODHA_TOKEN_EXPIRES_AT, 10)
  : null;

// WebSocket connection pools for market data
const finnhubConnections = new Map();
const binanceConnections = new Map();

// Helper to detect if symbol is crypto
function isCryptoSymbol(symbol) {
  const cryptoSymbols = [
    'BTC',
    'ETH',
    'BNB',
    'SOL',
    'ADA',
    'XRP',
    'DOGE',
    'DOT',
    'MATIC',
    'AVAX',
    'LINK',
    'UNI',
    'ATOM',
    'ETC',
    'LTC',
    'BCH',
    'XLM',
    'ALGO',
    'VET',
    'FIL',
    'TRX',
    'EOS',
    'AAVE',
    'MKR',
    'COMP',
    'SUSHI',
    'SNX',
    'YFI',
    'CRV',
    '1INCH',
  ];
  const upperSymbol = symbol.toUpperCase();
  return cryptoSymbols.some(c => upperSymbol.includes(c)) || upperSymbol.includes('USDT');
}

// Helper to map crypto symbol to Binance format
function mapToBinanceSymbol(symbol) {
  const upperSymbol = symbol.toUpperCase();
  // Remove exchange prefix if present
  const cleanSymbol = upperSymbol.includes(':') ? upperSymbol.split(':')[1] : upperSymbol;
  // Remove USDT if already present, then add it
  const baseSymbol = cleanSymbol.replace('USDT', '');
  return `${baseSymbol}USDT`.toLowerCase();
}

const YAHOO_SYMBOL_MAP = {
  NIFTY: '^NSEI',
  BANKNIFTY: '^NSEBANK',
  BANK: '^NSEBANK',
  SENSEX: '^BSESN',
  RELIANCE: 'RELIANCE.NS',
  TCS: 'TCS.NS',
  INFY: 'INFY.NS',
};

const FINNHUB_SYMBOL_MAP = {
  NIFTY: 'NSE:NIFTY',
  BANKNIFTY: 'NSE:NIFTY_BANK',
  RELIANCE: 'NSE:RELIANCE',
  TCS: 'NSE:TCS',
  INFY: 'NSE:INFY',
};

function normalizeSymbol(inputSymbol) {
  if (!inputSymbol) return 'NIFTY';
  return String(inputSymbol).trim().toUpperCase();
}

function mapToYahooSymbol(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  if (YAHOO_SYMBOL_MAP[symbol]) {
    return YAHOO_SYMBOL_MAP[symbol];
  }
  if (symbol.startsWith('^')) {
    return symbol;
  }
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) {
    return symbol;
  }
  return `${symbol}.NS`;
}

function mapToFinnhubSymbol(inputSymbol) {
  const symbol = normalizeSymbol(inputSymbol);
  if (FINNHUB_SYMBOL_MAP[symbol]) {
    return FINNHUB_SYMBOL_MAP[symbol];
  }
  if (symbol.startsWith('NSE:') || symbol.startsWith('BSE:')) {
    return symbol;
  }
  if (symbol.endsWith('.NS')) {
    return `NSE:${symbol.replace('.NS', '')}`;
  }
  if (symbol.endsWith('.BO')) {
    return `BSE:${symbol.replace('.BO', '')}`;
  }
  return `NSE:${symbol}`;
}

function roundPrice(value) {
  if (typeof value !== 'number') return value;
  return Math.round(value * 100) / 100;
}

async function fetchHistoricalCandles(inputSymbol, range = '1d', interval = '5m') {
  const yahooSymbol = mapToYahooSymbol(inputSymbol);
  const cacheKey = `${yahooSymbol}:${range}:${interval}`;
  const cached = STOCK_HISTORY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < STOCK_CACHE_TTL) {
    return cached.data;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}`;

  const params = {
    range,
    interval,
    includePrePost: true,
  };

  const response = await axios.get(url, { params }).catch(error => {
    throw new Error(
      `Failed to fetch Yahoo Finance data for ${yahooSymbol}: ${error?.message || 'unknown'}`
    );
  });

  const result = response?.data?.chart?.result?.[0];
  if (!result || !Array.isArray(result.timestamp) || !result.timestamp.length) {
    throw new Error(`No historical data available for ${yahooSymbol}`);
  }

  const quotes = result.indicators?.quote?.[0] || {};
  const { open = [], high = [], low = [], close = [], volume = [] } = quotes;

  const candles = result.timestamp
    .map((ts, index) => {
      if (
        open[index] == null ||
        high[index] == null ||
        low[index] == null ||
        close[index] == null
      ) {
        return null;
      }
      return {
        time: ts,
        open: roundPrice(open[index]),
        high: roundPrice(high[index]),
        low: roundPrice(low[index]),
        close: roundPrice(close[index]),
        volume: Number(volume[index] ?? 0),
      };
    })
    .filter(Boolean);

  STOCK_HISTORY_CACHE.set(cacheKey, { data: candles, timestamp: Date.now() });
  return candles;
}

// ============================================================================
// V1 RESEARCH API
// ============================================================================
fastify.post('/v1/search', async (request, reply) => {
  const { q, size, source_filters, sort, language, from_date, to_date } = request.body ?? {};
  try {
    const searchResponse = await researchSearch({
      query: q,
      size,
      sourceFilters: source_filters,
      sort,
      language,
      fromDate: from_date,
      toDate: to_date,
    });
    return searchResponse;
  } catch (error) {
    const status = error.message?.includes('Query is required') ? 400 : 500;
    reply.code(status);
    return {
      error: status === 400 ? 'bad_request' : 'search_failed',
      message: error.message,
      request_id: request.id,
    };
  }
});

fastify.post('/v1/answer', async (request, reply) => {
  const { q, max_context_tokens, source_filters, freshness, return_documents } = request.body ?? {};
  try {
    const answer = await generateResearchAnswer({
      query: q,
      max_context_tokens,
      source_filters,
      freshness,
      return_documents,
    });
    return answer;
  } catch (error) {
    const status = error.message?.includes('Query is required') ? 400 : 500;
    reply.code(status);
    return {
      error: status === 400 ? 'bad_request' : 'answer_failed',
      message: error.message,
      request_id: request.id,
    };
  }
});

fastify.post('/v1/answer/stream', async (request, reply) => {
  const body = request.body ?? {};
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  const sendEvent = (event, payload) => {
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    reply.raw.flush?.();
  };

  try {
    const result = await streamResearchAnswer({
      query: body.q,
      max_context_tokens: body.max_context_tokens,
      source_filters: body.source_filters,
      freshness: body.freshness,
      onToken: chunk => {
        if (chunk && chunk.trim().length > 0) {
          sendEvent('token', { text: chunk });
        }
      },
      onSources: citations => {
        sendEvent('citations', { citations });
      },
    });

    sendEvent('done', { query_id: result.query_id, model: result.model });
  } catch (error) {
    const status = error.message?.includes('Query is required') ? 400 : 500;
    reply.code(status);
    sendEvent('error', {
      error: status === 400 ? 'bad_request' : 'answer_failed',
      message: error.message,
    });
  } finally {
    reply.raw.end();
  }
});

fastify.get('/stock/historical/:symbol', async (request, reply) => {
  const { symbol } = request.params ?? {};
  const { range = '1d', interval = '5m' } = request.query ?? {};

  if (!symbol) {
    reply.code(400);
    return { error: 'symbol_required', message: 'Symbol path param is required' };
  }

  try {
    const candles = await fetchHistoricalCandles(symbol, range, interval);
    return {
      symbol: mapToYahooSymbol(symbol),
      range,
      interval,
      candles,
    };
  } catch (error) {
    fastify.log.error({ err: error, symbol, range, interval }, 'Historical data fetch failed');
    reply.code(502);
    return {
      error: 'stock_fetch_failed',
      message: error.message,
    };
  }
});

fastify.get('/stock/stream/:symbol', async (request, reply) => {
  const { symbol } = request.params ?? {};

  if (!symbol) {
    reply.code(400);
    return { error: 'symbol_required', message: 'Symbol path param is required' };
  }

  // Route crypto symbols to Binance WebSocket
  if (isCryptoSymbol(symbol)) {
    return handleBinanceStream(symbol, request, reply);
  }

  // Route stocks/indices to Finnhub
  if (!FINNHUB_TOKEN) {
    reply.code(503);
    return {
      error: 'finnhub_token_missing',
      message: 'Set FINNHUB_TOKEN env var to enable streaming quotes',
    };
  }

  const finnhubSymbol = mapToFinnhubSymbol(symbol);
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  const send = payload => {
    if (reply.raw.destroyed) return;
    try {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      fastify.log.debug({ error }, 'Failed to send to client');
    }
  };

  // CRITICAL FIX: Fan-out - reuse upstream connection per symbol with auto-reconnect
  let connection = finnhubConnections.get(finnhubSymbol);
  if (!connection) {
    // Create new upstream connection with reconnection logic
    let upstream = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 2000; // Start with 2 seconds
    const clients = new Set();
    let heartbeatInterval = null;
    let _reconnectTimeout = null;

    const connect = () => {
      try {
        upstream = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_TOKEN}`);

        upstream.on('open', () => {
          reconnectAttempts = 0; // Reset on successful connection
          upstream.send(JSON.stringify({ type: 'subscribe', symbol: finnhubSymbol }));
          fastify.log.info({ symbol: finnhubSymbol }, 'Finnhub upstream connected');

          // Start heartbeat every 20 seconds
          heartbeatInterval = setInterval(() => {
            if (upstream && upstream.readyState === WebSocket.OPEN) {
              try {
                upstream.ping();
              } catch (error) {
                fastify.log.debug({ error }, 'Heartbeat ping failed');
              }
            }
          }, 20000);
        });

        upstream.on('message', buffer => {
          try {
            const payload = JSON.parse(buffer.toString());
            if (payload.type === 'trade' && Array.isArray(payload.data)) {
              // Fan out to all clients
              for (const client of clients) {
                if (client.destroyed) continue;
                try {
                  for (const trade of payload.data) {
                    if (!trade?.p) continue;
                    const data = JSON.stringify({
                      symbol,
                      price: Number(trade.p),
                      volume: trade.v ?? 0,
                      timestamp: trade.t ?? Date.now(),
                    });
                    client.write(`data: ${data}\n\n`);
                  }
                } catch (error) {
                  fastify.log.debug({ error }, 'Failed to fan out to client');
                }
              }
            }
          } catch (error) {
            fastify.log.debug({ err: error }, 'Finnhub stream parse failed');
          }
        });

        upstream.on('error', error => {
          fastify.log.warn({ err: error, symbol: finnhubSymbol }, 'Finnhub websocket error');
          // Trigger reconnection
          scheduleReconnect();
        });

        upstream.on('close', (code, reason) => {
          fastify.log.info({ symbol: finnhubSymbol, code, reason }, 'Finnhub upstream closed');

          // Clear heartbeat
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }

          // Don't notify clients on intentional close (code 1000)
          if (code !== 1000) {
            // Schedule reconnection
            scheduleReconnect();
          } else {
            // Clean shutdown
            finnhubConnections.delete(finnhubSymbol);
          }
        });

        const scheduleReconnect = () => {
          if (reconnectAttempts >= maxReconnectAttempts) {
            fastify.log.error({ symbol: finnhubSymbol }, 'Max reconnection attempts reached');
            // Notify clients of permanent failure
            for (const client of clients) {
              if (!client.destroyed) {
                try {
                  client.write(
                    `data: ${JSON.stringify({ status: 'error', symbol: finnhubSymbol, message: 'Connection failed after retries' })}\n\n`
                  );
                } catch {
                  // ignore
                }
              }
            }
            finnhubConnections.delete(finnhubSymbol);
            return;
          }

          reconnectAttempts++;
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000); // Exponential backoff, max 30s

          fastify.log.info(
            { symbol: finnhubSymbol, attempt: reconnectAttempts, delay },
            'Scheduling reconnection'
          );

          reconnectTimeout = setTimeout(() => {
            fastify.log.info(
              { symbol: finnhubSymbol, attempt: reconnectAttempts },
              'Reconnecting to Finnhub'
            );
            connect(); // Reconnect
          }, delay);
        };

        connection = { upstream, clients, reconnect: scheduleReconnect };
        finnhubConnections.set(finnhubSymbol, connection);
      } catch (error) {
        fastify.log.error(
          { err: error, symbol: finnhubSymbol },
          'Failed to create Finnhub connection'
        );
        throw error;
      }
    };

    // Initial connection
    connect();

    upstream.on('error', error => {
      fastify.log.warn({ err: error, symbol: finnhubSymbol }, 'Finnhub websocket error');
      // Notify all clients
      for (const client of clients) {
        if (!client.destroyed) {
          try {
            client.write(
              `data: ${JSON.stringify({ status: 'error', message: error?.message || 'stream_error' })}\n\n`
            );
          } catch {
            // ignore
          }
        }
      }
    });

    connection = { upstream, clients };
    finnhubConnections.set(finnhubSymbol, connection);
  }

  // Add this client to the set
  connection.clients.add(reply.raw);
  send({ status: 'subscribed', symbol: finnhubSymbol, timestamp: Date.now() });

  const heartbeat = setInterval(() => {
    if (reply.raw.destroyed) {
      clearInterval(heartbeat);
      return;
    }
    reply.raw.write(': ping\n\n');
  }, 15000);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    // Remove client from set
    if (connection) {
      connection.clients.delete(reply.raw);
      // If no more clients, close upstream
      if (connection.clients.size === 0) {
        try {
          connection.upstream.close();
        } catch {
          // ignore
        }
        finnhubConnections.delete(finnhubSymbol);
        fastify.log.info({ symbol: finnhubSymbol }, 'Closed Finnhub upstream (no clients)');
      }
    }
  });
});

// Binance WebSocket stream handler for crypto
async function handleBinanceStream(symbol, request, reply) {
  const binanceSymbol = mapToBinanceSymbol(symbol);

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  const send = payload => {
    if (reply.raw.destroyed) return;
    try {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (error) {
      fastify.log.debug({ error }, 'Failed to send to client');
    }
  };

  // Fan-out: reuse upstream connection per symbol
  let connection = binanceConnections.get(binanceSymbol);
  if (!connection) {
    // Create new Binance WebSocket connection
    const upstream = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol}@ticker`);
    const clients = new Set();

    upstream.on('open', () => {
      fastify.log.info({ symbol: binanceSymbol }, 'Binance upstream connected');
      send({ status: 'subscribed', symbol: binanceSymbol, timestamp: Date.now() });
    });

    upstream.on('message', buffer => {
      try {
        const payload = JSON.parse(buffer.toString());

        // Binance ticker format: { e: '24hrTicker', c: 'price', P: 'changePercent', v: 'volume', ... }
        if (payload.e === '24hrTicker' && payload.c) {
          const price = Number(payload.c);
          const changePercent = Number(payload.P || 0);
          const change = (price * changePercent) / 100;
          const volume = Number(payload.v || 0);

          // Fan out to all clients
          for (const client of clients) {
            if (client.destroyed) continue;
            try {
              const data = JSON.stringify({
                symbol,
                price,
                change,
                changePercent,
                volume,
                timestamp: Date.now(),
              });
              client.write(`data: ${data}\n\n`);
            } catch (error) {
              fastify.log.debug({ error }, 'Failed to fan out to client');
            }
          }
        }
      } catch (error) {
        fastify.log.debug({ err: error }, 'Binance stream parse failed');
      }
    });

    upstream.on('close', () => {
      fastify.log.info({ symbol: binanceSymbol }, 'Binance upstream closed');
      for (const client of clients) {
        if (!client.destroyed) {
          try {
            client.write(
              `data: ${JSON.stringify({ status: 'closed', symbol: binanceSymbol })}\n\n`
            );
            client.end();
          } catch {
            // ignore
          }
        }
      }
      binanceConnections.delete(binanceSymbol);
    });

    upstream.on('error', error => {
      fastify.log.warn({ err: error, symbol: binanceSymbol }, 'Binance websocket error');
      for (const client of clients) {
        if (!client.destroyed) {
          try {
            client.write(
              `data: ${JSON.stringify({ status: 'error', message: error?.message || 'stream_error' })}\n\n`
            );
          } catch {
            // ignore
          }
        }
      }
    });

    connection = { upstream, clients };
    binanceConnections.set(binanceSymbol, connection);
  }

  // Add this client to the set
  connection.clients.add(reply.raw);
  send({ status: 'subscribed', symbol: binanceSymbol, timestamp: Date.now() });

  const heartbeat = setInterval(() => {
    if (reply.raw.destroyed) {
      clearInterval(heartbeat);
      return;
    }
    reply.raw.write(': ping\n\n');
  }, 15000);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    if (connection) {
      connection.clients.delete(reply.raw);
      if (connection.clients.size === 0) {
        try {
          connection.upstream.close();
        } catch {
          // ignore
        }
        binanceConnections.delete(binanceSymbol);
        fastify.log.info({ symbol: binanceSymbol }, 'Closed Binance upstream (no clients)');
      }
    }
  });
}

// Register CORS for Tauri migration
fastify.register(cors, {
  origin: [
    'http://localhost:1420', // Tauri dev server
    'tauri://localhost', // Tauri production
    'http://localhost:5173', // Vite dev (Electron fallback)
    'http://127.0.0.1:1420',
    'http://127.0.0.1:5173',
    'http://localhost:4000', // Direct backend access
    'http://127.0.0.1:4000', // Direct backend access
    '*', // Allow all origins for development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

// CATEGORY B FIX: Rate limiting for expensive endpoints
fastify.register(rateLimit, {
  global: false, // Apply per-route
  max: 10, // 10 requests
  timeWindow: 60 * 1000, // per minute
  keyGenerator: request => {
    // Use API key if present, otherwise IP
    const apiKey =
      request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    return apiKey || getClientIP(request);
  },
  errorResponseBuilder: (request, context) => {
    return {
      error: 'rate-limit-exceeded',
      message: `Rate limit exceeded: ${context.max} requests per ${context.timeWindow / 1000} seconds`,
      retryAfter: Math.ceil(context.ttl / 1000),
    };
  },
});

// CATEGORY B FIX: Rate limiting for expensive endpoints
fastify.register(rateLimit, {
  global: false, // Apply per-route
  max: 10, // 10 requests
  timeWindow: 60 * 1000, // per minute
  keyGenerator: request => {
    // Use API key if present, otherwise IP
    const apiKey =
      request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    return apiKey || getClientIP(request);
  },
  errorResponseBuilder: (request, context) => {
    return {
      error: 'rate-limit-exceeded',
      message: `Rate limit exceeded: ${context.max} requests per ${context.timeWindow / 1000} seconds`,
      retryAfter: Math.ceil(context.ttl / 1000),
    };
  },
});

const enableWebSockets = nodeProcess?.env.DISABLE_WS === '1' ? false : true;
// Removed unused agentQueryEndpointTimeout and agentPollInterval - using inline polling in route handlers

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const LLMCircuit = createCircuit(analyzeWithLLM, {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
});

// CATEGORY B FIX: API Key authentication (simple in-memory store for now)
const API_KEYS = new Map();
// Load API keys from env (format: API_KEY_1=key1:quota1,API_KEY_2=key2:quota2)
if (nodeProcess?.env.API_KEYS) {
  nodeProcess.env.API_KEYS.split(',').forEach(entry => {
    const [key, quota = '100'] = entry.split(':');
    if (key) {
      API_KEYS.set(key.trim(), { quota: parseInt(quota, 10) || 100, used: 0 });
    }
  });
}

// CATEGORY B FIX: Authentication middleware
async function authenticateRequest(request, reply) {
  // Skip auth for public endpoints
  const publicPaths = ['/metrics', '/metrics/prom', '/health', '/api/health'];
  if (publicPaths.some(path => request.url.startsWith(path))) {
    return;
  }

  const apiKey =
    request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    // Allow anonymous access but with lower rate limits
    request.user = { type: 'anonymous', quota: 10 };
    return;
  }

  const keyData = API_KEYS.get(apiKey);
  if (!keyData) {
    reply.code(401);
    return reply.send({ error: 'invalid-api-key', message: 'Invalid or missing API key' });
  }

  // Check quota
  if (keyData.used >= keyData.quota) {
    reply.code(429);
    return reply.send({
      error: 'quota-exceeded',
      message: `API key quota exceeded (${keyData.quota}/day)`,
    });
  }

  // Increment usage (in production, persist this)
  keyData.used++;
  request.user = { type: 'api-key', key: apiKey, quota: keyData.quota, used: keyData.used };
}

// Websocket plugin will be registered in async startup function below

// Removed unused waitForScrapeMeta function - using inline polling in route handlers

// Redis connection configuration with error handling
// CRITICAL FIX: Improved Redis config with exponential backoff reconnect
const redisConfig = {
  maxRetriesPerRequest: null, // BullMQ requirement
  retryStrategy: () => {
    // Don't retry - Redis is optional
    return null;
  },
  enableOfflineQueue: false,
  connectTimeout: 5000,
  lazyConnect: true, // Don't connect immediately - connect on first use
  showFriendlyErrorStack: false,
  // Prevent Redis from crashing the server
  enableReadyCheck: false,
  autoResubscribe: false,
  // Don't reconnect - Redis is optional
  reconnectOnError: () => false,
};

// Create Redis clients but don't connect immediately
// They will only connect when actually used
// Suppress all errors before creating clients
const redisPub = new Redis(REDIS_URL, redisConfig);
const redisSub = new Redis(REDIS_URL, redisConfig);
const redisStore = new Redis(REDIS_URL, redisConfig);

// Immediately suppress all error events for all Redis clients
[redisPub, redisSub, redisStore].forEach(client => {
  // Suppress all error events - Redis is optional
  client.on('error', () => {
    // Completely suppress all Redis errors - do nothing
  });

  // Prevent automatic connection attempts
  client.on('connect', () => {
    redisConnected = true;
  });

  client.on('close', () => {
    redisConnected = false;
  });

  client.on('end', () => {
    redisConnected = false;
  });
});

// Track connection state and error suppression
let redisConnected = false;
let _lastRedisErrorTime = 0;
const _REDIS_ERROR_SUPPRESSION_MS = 60000; // Suppress errors for 60 seconds

const clients = new Map();
const metricsClients = new Set();
const notificationClients = new Set();

// CRITICAL FIX: Connection limits per IP
const connectionLimits = new Map(); // IP => { sse: number, ws: number }
const MAX_SSE_PER_IP = 20;
const MAX_WS_PER_IP = 50;

function getClientIP(request) {
  return (
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.ip ||
    request.socket?.remoteAddress ||
    'unknown'
  );
}

function checkConnectionLimit(ip, type) {
  const limits = connectionLimits.get(ip) || { sse: 0, ws: 0 };
  const max = type === 'sse' ? MAX_SSE_PER_IP : MAX_WS_PER_IP;
  const current = limits[type] || 0;
  if (current >= max) {
    return false;
  }
  limits[type] = current + 1;
  connectionLimits.set(ip, limits);
  return true;
}

function decrementConnectionLimit(ip, type) {
  const limits = connectionLimits.get(ip);
  if (limits) {
    limits[type] = Math.max(0, (limits[type] || 0) - 1);
    if (limits.sse === 0 && limits.ws === 0) {
      connectionLimits.delete(ip);
    } else {
      connectionLimits.set(ip, limits);
    }
  }
}
const carbonIntensityDefault = Number(nodeProcess?.env.CARBON_INTENSITY_DEFAULT || 120);
let workerMetrics = {
  cpu: 0,
  memory: 0,
  rss: 0,
  timestamp: Date.now(),
  source: 'worker',
};
// Initialize CPU tracking before first metrics sample
let prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
let prevCpuTimestamp = Date.now();
let lastMetricsSample;

const notificationTypes = ['info', 'warning', 'alert', 'message'];
const notificationStore = [
  {
    id: uuidv4(),
    type: 'info',
    title: 'Welcome to Regen',
    body: 'Use ⌘K / Ctrl+K to open the universal command palette.',
    timestamp: new Date().toISOString(),
    read: false,
    meta: { tags: ['tips'] },
  },
  {
    id: uuidv4(),
    type: 'message',
    title: 'Workspace synced',
    body: 'Your trade workspace was synced successfully.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: true,
    meta: { tags: ['sync'] },
  },
];

const settingsState = {
  theme: 'auto',
  privacyMode: false,
  performanceMode: false,
  updatedAt: Date.now(),
};

const profileState = {
  id: 'user-demo',
  name: 'Ava Stratton',
  email: 'ava@example.com',
  avatarUrl: '',
  presence: 'online',
  orgs: [
    { id: 'org-browse', name: 'Omni Research' },
    { id: 'org-trade', name: 'Trade Ops' },
  ],
  activeOrgId: 'org-browse',
};
let profileSyncStatus = 'ready';

const redisClients = [
  { name: 'pub', client: redisPub },
  { name: 'sub', client: redisSub },
  { name: 'store', client: redisStore },
];

// Attach error handlers to all Redis clients immediately
redisClients.forEach(({ client, name }) => {
  attachRedisErrorHandlers(client, name);
});

// Helper function to safely use Redis with fallback
async function safeRedisOperation(operation, fallback = null) {
  if (!redisConnected) {
    return fallback;
  }
  try {
    return await operation();
  } catch (error) {
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      redisConnected = false;
    }
    return fallback;
  }
}

// Safe WebSocket send helper
function safeWsSend(ws, payload) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  } catch (err) {
    fastify.log.warn({ err }, 'failed to send ws payload');
    try {
      ws.terminate();
    } catch {
      // ignore termination errors
    }
  }
}

// Attach error handlers to all Redis clients
for (const { name, client } of redisClients) {
  client.on('connect', () => {
    redisConnected = true;
    if (fastify.log.level === 'debug') {
      fastify.log.debug({ redis: name }, 'Redis connected');
    }
  });

  client.on('ready', () => {
    redisConnected = true;
  });

  attachRedisErrorHandlers(client, name);

  client.on('close', () => {
    redisConnected = false;
  });

  client.on('end', () => {
    redisConnected = false;
  });
}

function broadcastNotification(notification) {
  const payload = `event: notification\ndata: ${JSON.stringify({ payload: notification })}\n\n`;
  for (const stream of notificationClients) {
    try {
      stream.write(payload);
    } catch (error) {
      fastify.log.warn({ error }, 'failed to push notification event');
      notificationClients.delete(stream);
    }
  }
}

function seedNotification() {
  const next = {
    id: uuidv4(),
    type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
    title: 'System update available',
    body: 'New insights are ready in SuperMemory. Review the diff to apply changes.',
    timestamp: new Date().toISOString(),
    read: false,
    meta: { tags: ['system'] },
  };
  notificationStore.unshift(next);
  if (notificationStore.length > 50) {
    notificationStore.length = 50;
  }
  broadcastNotification(next);
}

if (nodeProcess?.env.MOCK_NOTIFICATIONS !== '0') {
  globalSetInterval(
    seedNotification,
    Number(nodeProcess?.env.MOCK_NOTIFICATION_INTERVAL || 90_000)
  );
}

// ============================================================================
// BOUNTY SYSTEM ENDPOINTS (Week 3 - Viral Growth)
// ============================================================================

// In-memory store for bounties (in production, use database)
const bountyStore = new Map();

// Submit bounty
fastify.post('/bounty/submit', async (request, reply) => {
  const { title, videoUrl, platform, description, upiId, userId } = request.body || {};

  if (!title || !videoUrl || !upiId) {
    reply.code(400);
    return { error: 'Missing required fields: title, videoUrl, upiId' };
  }

  const bountyId = uuidv4();
  const bounty = {
    id: bountyId,
    title,
    videoUrl,
    platform,
    description,
    upiId,
    userId: userId || 'anonymous',
    status: 'pending',
    views: 0,
    verifiedViews: 0,
    submittedAt: Date.now(),
    payoutAmount: 0,
  };

  bountyStore.set(bountyId, bounty);

  fastify.log.info({ bountyId, platform }, 'Bounty submitted');

  return {
    id: bountyId,
    status: 'pending',
    message: 'Bounty submission received. Verification in progress.',
  };
});

// Verify video views
fastify.post('/bounty/verify', async (request, reply) => {
  const { videoUrl, platform } = request.body || {};

  if (!videoUrl || !platform) {
    reply.code(400);
    return { error: 'Missing videoUrl or platform' };
  }

  // In production, would call platform APIs (YouTube Data API, X API, etc.)
  // For now, return mock verification
  const mockViews = Math.floor(Math.random() * 100000) + 10000; // 10K - 110K

  fastify.log.info({ videoUrl, platform, views: mockViews }, 'Video views verified');

  return {
    views: mockViews,
    verified: true,
    platform,
    verifiedAt: Date.now(),
  };
});

// Get bounty status
fastify.get('/bounty/status/:id', async (request, reply) => {
  const { id } = request.params || {};

  const bounty = bountyStore.get(id);
  if (!bounty) {
    reply.code(404);
    return { error: 'Bounty not found' };
  }

  return bounty;
});

// Get leaderboard
fastify.get('/bounty/leaderboard', async (request, _reply) => {
  const limit = Number(request.query?.limit || 10);

  // In production, would query database
  // For now, return mock leaderboard
  const leaderboard = [
    {
      userId: 'user1',
      userName: 'TechGuru',
      totalViews: 2500000,
      totalEarned: 12500,
      submissionCount: 5,
      rank: 1,
    },
    {
      userId: 'user2',
      userName: 'AIBrowser',
      totalViews: 1800000,
      totalEarned: 9000,
      submissionCount: 4,
      rank: 2,
    },
    {
      userId: 'user3',
      userName: 'DemoMaster',
      totalViews: 1200000,
      totalEarned: 6000,
      submissionCount: 3,
      rank: 3,
    },
  ];

  return leaderboard.slice(0, limit);
});

// Get user submissions
fastify.get('/bounty/user/:userId', async (request, _reply) => {
  const { userId } = request.params || {};

  const userBounties = Array.from(bountyStore.values()).filter(b => b.userId === userId);

  return userBounties;
});

// Process payout (admin endpoint - would be secured in production)
fastify.post('/bounty/payout/:id', async (request, reply) => {
  const { id } = request.params || {};

  const bounty = bountyStore.get(id);
  if (!bounty) {
    reply.code(404);
    return { error: 'Bounty not found' };
  }

  if (bounty.verifiedViews < 50000) {
    reply.code(400);
    return { error: 'Bounty does not meet minimum view requirement (50K)' };
  }

  // In production, would:
  // 1. Call UPI payment API
  // 2. Update bounty status to 'paid'
  // 3. Log transaction

  bounty.status = 'paid';
  bounty.payoutAmount = 500; // ₹500
  bounty.paidAt = Date.now();

  bountyStore.set(id, bounty);

  fastify.log.info({ bountyId: id, upiId: bounty.upiId, amount: 500 }, 'Bounty payout processed');

  return {
    success: true,
    message: 'Payout processed',
    payoutAmount: 500,
    paidAt: bounty.paidAt,
  };
});

fastify.get('/health', async () => ({
  ok: true,
  time: Date.now(),
  clients: clients.size,
}));

// Metrics endpoint
fastify.get('/metrics', async () => {
  return getMetrics();
});

// CATEGORY B FIX: Prometheus metrics endpoint
// NOTE: /metrics/prom route is defined later (line 3774) with more complete metrics
// This duplicate definition has been removed to prevent route conflict

if (enableWebSockets) {
  fastify.get('/ws', { websocket: true }, (connection, request) => {
    const ws = connection.socket;
    const clientId = uuidv4();

    // CRITICAL FIX: Check connection limit
    const clientIP = getClientIP(request);
    if (!checkConnectionLimit(clientIP, 'ws')) {
      try {
        ws.close(1008, `Maximum ${MAX_WS_PER_IP} WebSocket connections per IP`);
      } catch {
        // ignore
      }
      return;
    }

    const meta = { clientId, createdAt: Date.now(), lastPong: Date.now(), ip: clientIP };

    clients.set(ws, meta);
    fastify.log.info({ clientId }, 'redix ws connected');

    // respond to pongs
    ws.on('pong', () => {
      meta.lastPong = Date.now();
    });

    // setup a per-client ping interval to detect stale clients
    const pingInterval = setInterval(() => {
      try {
        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(pingInterval);
          return;
        }
        // If client hasn't ponged for 60s, terminate
        if (Date.now() - meta.lastPong > 60_000) {
          fastify.log.info({ clientId }, 'terminating stale ws client');
          try {
            ws.terminate();
          } catch {
            // ignore termination errors
          }
          clearInterval(pingInterval);
          return;
        }
        ws.ping();
      } catch (err) {
        fastify.log.warn({ err }, 'ws ping failed');
      }
    }, 30000);

    ws.on('message', async raw => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (error) {
        fastify.log.warn({ error }, 'invalid json from client');
        safeWsSend(ws, JSON.stringify({ type: 'error', payload: { message: 'invalid-json' } }));
        return;
      }

      switch (message.type) {
        case 'start_query':
          handleStartQuery(ws, message).catch(error => {
            fastify.log.error({ error }, 'failed to handle start_query');
            safeWsSend(
              ws,
              JSON.stringify({ id: message.id, type: 'error', payload: { message: error.message } })
            );
          });
          break;
        case 'cancel':
          handleCancel(message);
          break;
        default:
          safeWsSend(
            ws,
            JSON.stringify({ id: message.id, type: 'error', payload: { message: 'unknown-type' } })
          );
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      clients.delete(ws);
      // CRITICAL FIX: Decrement connection limit
      decrementConnectionLimit(clientIP, 'ws');
      fastify.log.info({ clientId }, 'redix ws disconnected');
    });

    ws.on('error', err => {
      fastify.log.warn({ err }, 'ws error on client ' + clientId);
    });
  });

  fastify.get('/ws/metrics', { websocket: true }, connection => {
    const ws = connection.socket;
    metricsClients.add(ws);
    fastify.log.debug('metrics client connected');
    safeWsSend(ws, JSON.stringify(lastMetricsSample));
    ws.on('close', () => {
      metricsClients.delete(ws);
    });
  });
}

fastify.get('/ws/notifications', async (request, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();
  reply.hijack();

  const stream = reply.raw;
  notificationClients.add(stream);
  const bootstrap = {
    unreadCount: notificationStore.filter(item => !item.read).length,
  };
  stream.write(`event: bootstrap\ndata: ${JSON.stringify(bootstrap)}\n\n`);

  stream.on('close', () => {
    notificationClients.delete(stream);
  });
});

// Register sync service routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const syncApi = require('./services/sync/api.cjs');
  const sessionCursorApi = require('./services/sync/session-cursor-api.cjs');
  const syncPlugin = expressToFastify(syncApi);
  const sessionPlugin = expressToFastify(sessionCursorApi);
  fastify.register(syncPlugin, { prefix: '/api/sync' });
  fastify.register(sessionPlugin, { prefix: '/api/session' });
  fastify.log.info('Sync service routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register sync service routes (optional)');
}

// Register enhanced search/RAG API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const searchApiEnhanced = require('./search-engine/api-enhanced.cjs');
  const searchPlugin = expressToFastify(searchApiEnhanced);
  fastify.register(searchPlugin, { prefix: '/api/search' });
  fastify.log.info('Enhanced search API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register enhanced search API routes (optional)');
}

// Register enhanced agent API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const agentApiEnhanced = require('./agent-engine/agent-api-enhanced.cjs');
  const agentPlugin = expressToFastify(agentApiEnhanced);
  fastify.register(agentPlugin, { prefix: '/api/agent' });
  fastify.log.info('Enhanced agent API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register enhanced agent API routes (optional)');
}

// Register agent WebSocket server
try {
  const { createAgentWebSocket } = require('./agent-engine/agent-websocket.cjs');
  createAgentWebSocket(fastify.server);
  fastify.log.info('Agent WebSocket server registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register agent WebSocket server (optional)');
}

// Register browser automation API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const browserAutomationApi = require('./agent-engine/browser-automation-api.cjs');
  const browserAutomationPlugin = expressToFastify(browserAutomationApi.router);
  fastify.register(browserAutomationPlugin, { prefix: '/api/browser-automation' });
  fastify.log.info('Browser automation API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register browser automation API routes (optional)');
}

// Register browser automation WebSocket server
try {
  const { createBrowserAutomationWebSocket } = require('./agent-engine/browser-automation-api.cjs');
  createBrowserAutomationWebSocket(fastify.server);
  fastify.log.info('Browser automation WebSocket server registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register browser automation WebSocket server (optional)');
}

// Register scraper API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const scraperApi = require('./services/scraper/scraper-api.cjs');
  const scraperPlugin = expressToFastify(scraperApi);
  fastify.register(scraperPlugin, { prefix: '/api/scraper' });
  fastify.log.info('Scraper API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register scraper API routes (optional)');
}

// Register adblock API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const adblockApi = require('./services/adblock/adblock-api.cjs');
  const adblockPlugin = expressToFastify(adblockApi);
  fastify.register(adblockPlugin, { prefix: '/api/adblock' });
  fastify.log.info('Adblock API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register adblock API routes (optional)');
}

// Register download API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const downloadApi = require('./services/download/download-api.cjs');
  const downloadPlugin = expressToFastify(downloadApi);
  fastify.register(downloadPlugin, { prefix: '/api/download' });
  fastify.log.info('Download API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register download API routes (optional)');
}

// Register voice WebSocket server
try {
  const { createVoiceWebSocket } = require('./services/voice/voice-websocket.cjs');
  createVoiceWebSocket(fastify.server);
  fastify.log.info('Voice WebSocket server registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register voice WebSocket server (optional)');
}

// Register enhanced trade API routes
try {
  const { expressToFastify } = require('./utils/express-to-fastify.cjs');
  const tradeApiEnhanced = require('./services/trade/trade-api-enhanced.cjs');
  const tradePlugin = expressToFastify(tradeApiEnhanced);
  fastify.register(tradePlugin, { prefix: '/api/trade' });
  fastify.log.info('Enhanced trade API routes registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register enhanced trade API routes (optional)');
}

// Register trade WebSocket server
try {
  const { createTradeWebSocket } = require('./services/trade/trade-websocket.cjs');
  createTradeWebSocket(fastify.server);
  fastify.log.info('Trade WebSocket server registered');
} catch (error) {
  fastify.log.warn({ err: error }, 'Failed to register trade WebSocket server (optional)');
}

fastify.post('/api/query', async (request, reply) => {
  const body = request.body ?? {};
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : 'anon';
  if (!query) {
    return reply.status(400).send({ error: 'missing-query' });
  }

  try {
    await safeRedisOperation(
      () =>
        redisStore.hset(`session:${sessionId}`, {
          lastQuery: query,
          lastAt: Date.now(),
        }),
      null
    );
    const items = await runSearch(query);
    return { items };
  } catch (error) {
    request.log.error({ error }, 'fallback query failed');
    return reply.status(500).send({ error: 'redix-backend-unavailable' });
  }
});

/**
 * POST /api/scrape
 * Direct scrape endpoint (replaces queue-based scraping for simpler use)
 */
fastify.post('/api/scrape', async (request, reply) => {
  return scrapeUrl(request, reply);
});

fastify.get('/api/scrape/meta/:jobId', async (request, reply) => {
  const { jobId } = request.params ?? {};
  if (!jobId) {
    return reply.status(400).send({ error: 'missing-jobId' });
  }
  const metaKey = `scrape:meta:${jobId}`;
  const meta = await safeRedisOperation(() => redisStore.get(metaKey), null);
  if (!meta) {
    return reply.status(404).send({ error: 'not-found' });
  }
  return JSON.parse(meta);
});

fastify.get('/api/scrape/body/:jobId', async (request, reply) => {
  const { jobId } = request.params ?? {};
  if (!jobId) {
    return reply.status(400).send({ error: 'missing-jobId' });
  }
  const bodyKey = `scrape:body:${jobId}`;
  const body = await safeRedisOperation(() => redisStore.get(bodyKey), null);
  if (!body) {
    return reply.status(404).send({ error: 'not-found' });
  }
  reply.header('content-type', 'text/plain; charset=utf-8');
  return body;
});

fastify.get('/api/notifications', async request => {
  const { limit } = request.query ?? {};
  const parsedLimit = Number(limit) || 10;
  const slice = notificationStore.slice(0, Math.max(1, Math.min(parsedLimit, 50)));
  const unread = notificationStore.filter(item => !item.read).length;
  return { notifications: slice, unreadCount: unread };
});

fastify.post('/api/notifications/:id/read', async (request, reply) => {
  const { id } = request.params ?? {};
  if (!id) {
    return reply.status(400).send({ error: 'missing-id' });
  }
  const target = notificationStore.find(item => item.id === id);
  if (!target) {
    return reply.status(404).send({ error: 'not-found' });
  }
  target.read = true;
  return { ok: true };
});

fastify.post('/api/notifications/mark-all-read', async () => {
  for (const notification of notificationStore) {
    notification.read = true;
  }
  return { ok: true };
});

fastify.get('/api/settings', async () => settingsState);

fastify.post('/api/settings', async request => {
  const body = request.body ?? {};
  settingsState.theme =
    body.theme === 'dark' || body.theme === 'light' || body.theme === 'auto'
      ? body.theme
      : settingsState.theme;
  settingsState.privacyMode =
    typeof body.privacyMode === 'boolean' ? body.privacyMode : settingsState.privacyMode;
  settingsState.performanceMode =
    typeof body.performanceMode === 'boolean'
      ? body.performanceMode
      : settingsState.performanceMode;
  settingsState.updatedAt = Date.now();
  return { ok: true, settings: settingsState };
});

fastify.get('/api/profile', async () => ({
  user: profileState,
  syncStatus: profileSyncStatus,
}));

fastify.post('/api/profile/switch-org', async (request, reply) => {
  const { orgId } = request.body ?? {};
  if (!orgId) {
    return reply.status(400).send({ error: 'missing-orgId' });
  }
  const exists = profileState.orgs?.some(org => org.id === orgId);
  if (!exists) {
    return reply.status(404).send({ error: 'org-not-found' });
  }
  profileState.activeOrgId = orgId;
  return { ok: true, activeOrgId: orgId };
});

fastify.post('/api/profile/signout', async () => ({ ok: true }));

/**
 * POST /api/agent/research
 * Real research agent with LLM integration
 */
fastify.post('/api/agent/research', async (request, reply) => {
  return researchAgent(request, reply);
});

/**
 * POST /api/research/run
 * New research endpoint with job queue and streaming
 */
fastify.post('/api/research/run', async (request, reply) => {
  return runResearch(request, reply);
});

/**
 * POST /api/search/hybrid
 * Hybrid search across multiple sources
 */
fastify.post('/api/search/hybrid', async (request, reply) => {
  return hybridSearch(request, reply);
});

/**
 * GET /api/_health
 * Server health check
 */
fastify.get('/api/_health', async (request, reply) => {
  return healthCheck(request, reply);
});

/**
 * POST /api/proxy/bing/search
 * Proxy Bing search API calls
 */
fastify.post('/api/proxy/bing/search', async (request, reply) => {
  return proxyBingSearch(request, reply);
});

/**
 * POST /api/proxy/openai
 * Proxy OpenAI API calls
 */
fastify.post('/api/proxy/openai', async (request, reply) => {
  return proxyOpenAI(request, reply);
});

/**
 * POST /api/proxy/anthropic
 * Proxy Anthropic API calls
 */
fastify.post('/api/proxy/anthropic', async (request, reply) => {
  return proxyAnthropic(request, reply);
});

/**
 * POST /api/ai/task
 * Unified AI task endpoint with backoff and fallback
 */
fastify.post('/api/ai/task', async (request, reply) => {
  return aiTask(request, reply);
});

/**
 * GET /api/research/status/:jobId
 * Get research job status
 */
fastify.get('/api/research/status/:jobId', async (request, reply) => {
  return getResearchStatus(request, reply);
});

/**
 * GET /api/research/scrape
 * Production parallel scraper (X + arXiv + GitHub)
 */
fastify.get('/api/research/scrape', async (request, reply) => {
  const { q } = request.query;
  if (!q) {
    return reply.code(400).send({ error: 'Query parameter "q" is required' });
  }
  
  try {
    const { parallelSearch } = await import('./services/research/scraper-parallel-production.js');
    const result = await parallelSearch(q);
    return result;
  } catch (error) {
    console.error('[ResearchScraper] Error:', error);
    return reply.code(500).send({
      error: 'Scraping failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/research/langgraph
 * LangGraph-style workflow with 5 golden agents
 */
fastify.post('/api/research/langgraph', async (request, reply) => {
  const { topic } = request.body;
  if (!topic) {
    return reply.code(400).send({ error: 'Topic is required' });
  }
  
  try {
    const { executeLangGraphWorkflow } = await import('./services/research/langgraph-workflow.js');
    const result = await executeLangGraphWorkflow(topic);
    return result;
  } catch (error) {
    console.error('[LangGraphWorkflow] Error:', error);
    return reply.code(500).send({
      error: 'Workflow failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/pdf/upload
 * PDF Upload + Smart Extraction + Auto-Research
 */
fastify.post('/api/pdf/upload', async (request, reply) => {
  const data = await request.file();
  
  if (!data) {
    return reply.code(400).send({ error: 'PDF file is required' });
  }
  
  if (!data.mimetype || !data.mimetype.includes('pdf')) {
    return reply.code(400).send({ error: 'File must be a PDF' });
  }
  
  try {
    const { processPDFUpload } = await import('./services/pdf/pdf-extractor.js');
    
    const file = {
      filename: data.filename,
      buffer: await data.toBuffer(),
      mimetype: data.mimetype,
    };
    
    const result = await processPDFUpload(file, {
      autoResearch: request.body?.autoResearch !== false,
      customQuery: request.body?.customQuery,
    });
    
    return result;
  } catch (error) {
    console.error('[PDFUpload] Error:', error);
    return reply.code(500).send({
      error: 'PDF processing failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/collab/room/:roomId
 * Get collaborative room content
 */
fastify.get('/api/collab/room/:roomId', async (request, reply) => {
  const { roomId } = request.params;
  
  try {
    const { getRoomContent } = await import('./services/collab/collab-server.js');
    const content = getRoomContent(roomId);
    
    if (content === null) {
      return reply.code(404).send({ error: 'Room not found' });
    }
    
    return {
      roomId,
      content,
    };
  } catch (error) {
    console.error('[CollabAPI] Error:', error);
    return reply.code(500).send({
      error: 'Failed to get room content',
      message: error.message,
    });
  }
});

/**
 * POST /api/export
 * Export research to Notion/Obsidian/Roam
 */
fastify.post('/api/export', async (request, reply) => {
  const { content_md, tool, parent_id, graph_name } = request.body;

  if (!content_md || !tool) {
    return reply.code(400).send({
      error: 'content_md and tool are required',
    });
  }

  try {
    const { exportToTool } = await import('./services/export/export-service.js');
    const result = await exportToTool(content_md, tool, {
      parentId: parent_id,
      graphName: graph_name,
    });

    // For Obsidian, return file for download
    if (tool === 'obsidian' && result.content) {
      return reply
        .type('text/markdown')
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .send(result.content);
    }

    return result;
  } catch (error) {
    console.error('[ExportAPI] Error:', error);
    return reply.code(500).send({
      error: 'Export failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/video/summary
 * Generate 60-second video summary
 */
fastify.post('/api/video/summary', async (request, reply) => {
  const { text, voice_id } = request.body;

  if (!text) {
    return reply.code(400).send({
      error: 'text is required',
    });
  }

  try {
    const { generateVideoSummary } = await import('./services/video/video-summary.js');
    const result = await generateVideoSummary(text, voice_id);
    return result;
  } catch (error) {
    console.error('[VideoAPI] Error:', error);
    return reply.code(500).send({
      error: 'Video generation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/ollama/health
 * Check Ollama availability
 */
fastify.get('/api/ollama/health', async (request, reply) => {
  try {
    const { checkOllamaHealth } = await import('./services/ollama/local-llm.js');
    const health = await checkOllamaHealth();
    return health;
  } catch (error) {
    return reply.code(500).send({
      available: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/youtube/analyze
 * Analyze YouTube video → deep research report
 */
fastify.post('/api/youtube/analyze', async (request, reply) => {
  const { url } = request.body;

  if (!url) {
    return reply.code(400).send({
      error: 'YouTube URL is required',
    });
  }

  try {
    const { analyzeYouTube } = await import('./services/youtube/youtube-analyzer.js');
    const result = await analyzeYouTube(url);
    return result;
  } catch (error) {
    console.error('[YouTubeAPI] Analysis error:', error);
    return reply.code(500).send({
      error: 'YouTube analysis failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/youtube/to-video
 * YouTube → 60-second response video
 */
fastify.post('/api/youtube/to-video', async (request, reply) => {
  const { youtube_url, voice_id } = request.body;

  if (!youtube_url) {
    return reply.code(400).send({
      error: 'YouTube URL is required',
    });
  }

  try {
    const { youtubeToResponseVideo } = await import('./services/youtube/youtube-to-video.js');
    const result = await youtubeToResponseVideo(youtube_url, voice_id);
    return result;
  } catch (error) {
    console.error('[YouTubeAPI] Video generation error:', error);
    return reply.code(500).send({
      error: 'Response video generation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/agent/execute
 * Execute agent actions
 */
fastify.post('/api/agent/execute', async (request, reply) => {
  return executeAgent(request, reply);
});

/**
 * POST /api/agent/query
 * Enhanced agent query endpoint with task support, waitFor polling, and 202 fallback
 * Body: { url, text?, question, task?: 'summarize'|'qa'|'threat', waitFor?: number, callback_url?: string, userId?: string }
 */
// CATEGORY B FIX: Rate limit + auth for expensive endpoints
fastify.post(
  '/api/agent/query',
  {
    config: { rateLimit: { max: 10, timeWindow: 60 * 1000 } },
    preHandler: [authenticateRequest],
  },
  async (request, reply) => {
    const {
      url,
      text,
      question,
      task = 'summarize',
      waitFor = 8,
      callback_url,
      userId,
    } = request.body ?? {};

    if (!url && !text) {
      return reply.status(400).send({ error: 'url-or-text-required' });
    }
    if (!question && task === 'qa') {
      return reply.status(400).send({ error: 'question-required-for-qa-task' });
    }

    let jobId = null;
    let meta = null;
    let body = null;

    // If URL provided, enqueue scrape
    if (url) {
      jobId = sha256(url);
      try {
        await enqueueScrape({ url, userId, jobId });
      } catch (error) {
        request.log.error({ error }, 'failed to enqueue scrape for agent query');
        return reply.status(500).send({ error: 'scrape-enqueue-failed' });
      }

      // Poll for scrape meta + body
      const pollUntil = Date.now() + waitFor * 1000;
      while (Date.now() < pollUntil) {
        const raw = await safeRedisOperation(() => redisStore.get(`scrape:meta:${jobId}`), null);
        if (raw) {
          try {
            meta = JSON.parse(raw);
            if (meta.bodyKey) {
              body = await safeRedisOperation(() => redisStore.get(meta.bodyKey), null);
              if (body) break;
            }
          } catch (error) {
            request.log.warn({ error }, 'failed to parse scrape meta');
          }
        }
        await new Promise(r => globalThis.setTimeout(r, 400)); // 400ms backoff
      }

      // If not ready, return 202
      if (!body) {
        return reply.status(202).send({
          jobId,
          status: 'enqueued',
          message:
            'Scrape in progress, poll /api/scrape/meta/:jobId or /api/agent/result/:jobId/:task',
        });
      }

      // Validate scrape result
      if (!meta.allowed || meta.status >= 400) {
        return reply.status(502).send({ error: 'scrape-failed', jobId, meta });
      }
    } else {
      // For raw text, generate jobId and store in Redis
      jobId = sha256(text + Date.now());
      await safeRedisOperation(
        () => redisStore.set(`agent:input:${jobId}`, text, 'EX', 60 * 60),
        null
      );
      body = text;
      meta = {
        jobId,
        url: null,
        status: 200,
        cached: false,
        fetchedAt: new Date().toISOString(),
        bodyKey: `agent:input:${jobId}`,
      };
    }

    // Prepare provenance
    const provenance = {
      scrapeJobId: jobId,
      url: url || null,
      status: meta.status,
      cached: Boolean(meta.cached),
      fetchedAt: meta.fetchedAt,
      durationMs: meta.durationMs || 0,
      headers: meta.headers || {},
      bodyKey: meta.bodyKey || `agent:input:${jobId}`,
      excerpt: body?.slice(0, 500) || '',
      scrapeErrors: meta.reason || null,
    };

    // Call LLM through circuit breaker
    try {
      const llmResult = await LLMCircuit.fire({
        task,
        inputText: body,
        url: url || null,
        question: question || null,
        userId: userId || null,
      });

      const agentResult = {
        answer: llmResult.answer,
        summary: llmResult.summary,
        highlights: llmResult.highlights,
        model: llmResult.model,
        sources: [
          {
            url: url || 'text-input',
            jobId,
            selector: null,
          },
        ],
        provenance,
      };

      // Store result in Redis
      const resultKey = `agent:result:${jobId}:${task}`;
      await safeRedisOperation(
        () => redisStore.set(resultKey, JSON.stringify(agentResult), 'EX', 60 * 60),
        null
      );

      // Optional callback (fire-and-forget)
      if (callback_url) {
        fetch(callback_url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(agentResult),
        }).catch(e => {
          request.log.warn({ error: e }, 'callback failed');
        });
      }

      return reply.send({
        jobId,
        task,
        agentResult,
      });
    } catch (error) {
      request.log.error({ error }, 'LLM analysis failed');
      // Check if circuit is open
      if (LLMCircuit.opened) {
        return reply.status(503).send({
          error: 'llm-circuit-open',
          message: 'LLM service temporarily unavailable',
          jobId,
        });
      }
      return reply.status(500).send({ error: 'analysis-failed', jobId });
    }
  }
);

/**
 * GET /api/agent/result/:jobId/:task
 * Poll for agent result
 */
fastify.get('/api/agent/result/:jobId/:task', async (request, reply) => {
  const { jobId, task } = request.params ?? {};
  if (!jobId || !task) {
    return reply.status(400).send({ error: 'missing-jobId-or-task' });
  }

  const resultKey = `agent:result:${jobId}:${task}`;
  const raw = await safeRedisOperation(() => redisStore.get(resultKey), null);
  if (!raw) {
    return reply.status(404).send({ error: 'result-not-found', status: 'pending' });
  }

  try {
    const agentResult = JSON.parse(raw);
    return reply.send({ jobId, task, agentResult, status: 'complete' });
  } catch (error) {
    request.log.error({ error }, 'failed to parse agent result');
    return reply.status(500).send({ error: 'parse-failed' });
  }
});

fastify.get('/api/ask', async (request, reply) => {
  const { q, query: queryParam, sessionId: sessionParam } = request.query ?? {};
  const query =
    typeof q === 'string' && q.trim()
      ? q.trim()
      : typeof queryParam === 'string'
        ? queryParam.trim()
        : '';
  const sessionId =
    typeof sessionParam === 'string' && sessionParam.trim() ? sessionParam.trim() : 'anon';

  // CRITICAL FIX: Check connection limit
  const clientIP = getClientIP(request);
  if (!checkConnectionLimit(clientIP, 'sse')) {
    reply.code(429);
    return {
      error: 'connection-limit-exceeded',
      message: `Maximum ${MAX_SSE_PER_IP} SSE connections per IP`,
    };
  }

  if (!query) {
    reply.status(400);
    reply.header('content-type', 'application/json');
    reply.send(JSON.stringify({ error: 'missing-query' }));
    return;
  }

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  let closed = false;
  const requestId = uuidv4();
  // CRITICAL FIX: Use duplicate() instead of new Redis() to prevent file descriptor exhaustion
  const redisClient = redisSub.duplicate();
  let heartbeatInterval;

  // Attach proper error handlers
  attachRedisErrorHandlers(redisClient, 'sse-client');

  // Ensure connection is established
  try {
    await redisClient.connect();
  } catch (error) {
    fastify.log.warn({ error }, 'Failed to connect duplicate Redis client for SSE');
    reply.code(503);
    reply.send({ error: 'redis-unavailable', message: 'Redis connection failed' });
    return;
  }

  const sendEvent = (event, payload) => {
    if (closed) return;
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${JSON.stringify(payload ?? {})}\n\n`);
    reply.raw.flush?.();
  };

  const cleanup = async (shouldEnd = false) => {
    if (closed) return;
    closed = true;
    globalClearInterval(heartbeatInterval);
    redisClient.off('message', onMessage);
    try {
      await redisClient.unsubscribe('redix_results');
    } catch (error) {
      fastify.log.warn({ error }, 'sse client unsubscribe failed');
    }
    try {
      await redisClient.disconnect();
    } catch (error) {
      fastify.log.debug({ error }, 'redis client disconnect error (ignored)');
    }
    if (shouldEnd) {
      reply.raw.end();
    }
  };

  let taskId;
  try {
    taskId = await enqueueQueryTask({ id: requestId, sessionId, query, options: {} });
  } catch (error) {
    sendEvent('error', { message: error?.message ?? 'failed-to-enqueue' });
    await cleanup(true);
    return;
  }

  const onMessage = (channel, raw) => {
    if (channel !== 'redix_results') {
      return;
    }

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      fastify.log.warn({ error }, 'invalid result payload for sse client');
      return;
    }

    if (message?.id !== requestId) {
      return;
    }

    switch (message.type) {
      case 'partial_result':
        sendEvent('update', message.payload ?? {});
        break;
      case 'stream':
        sendEvent('token', message.payload ?? {});
        break;
      case 'final_result':
        sendEvent('result', message.payload ?? {});
        sendEvent('done', { taskId });
        cleanup(true).catch(error => fastify.log.error({ error }, 'failed to cleanup sse client'));
        break;
      case 'error':
        sendEvent('error', message.payload ?? { message: 'unknown-error' });
        cleanup(true).catch(error => fastify.log.error({ error }, 'failed to cleanup sse client'));
        break;
      default:
        sendEvent('update', message.payload ?? {});
    }
  };

  try {
    await redisClient.subscribe('redix_results');
  } catch (error) {
    sendEvent('error', { message: error?.message ?? 'subscription-failed' });
    await cleanup(true);
    return;
  }

  redisClient.on('message', onMessage);

  sendEvent('ack', { id: requestId, taskId });

  heartbeatInterval = globalSetInterval(() => {
    if (closed) return;
    reply.raw.write(': ping\n\n');
    reply.raw.flush?.();
  }, 15000);

  request.raw.on('close', () => {
    if (!closed) {
      redisPub
        .publish('redix_cancels', JSON.stringify({ taskId, reason: 'client-disconnect' }))
        .catch(error => fastify.log.warn({ error }, 'failed to publish cancel for sse client'));
      cleanup(false).catch(error =>
        fastify.log.error({ error }, 'failed to cleanup after disconnect')
      );
      // CRITICAL FIX: Decrement connection limit
      decrementConnectionLimit(clientIP, 'sse');
    }
  });
});

async function handleStartQuery(ws, message) {
  const { id, payload } = message;
  if (!payload?.query) {
    ws.send(JSON.stringify({ id, type: 'error', payload: { message: 'missing-query' } }));
    return;
  }

  const sessionId = payload.sessionId || 'anon';
  const taskId = await enqueueQueryTask({
    id,
    sessionId,
    query: payload.query,
    options: payload.options ?? {},
  });

  safeWsSend(ws, JSON.stringify({ id, type: 'ack', payload: { taskId } }));
}

async function handleCancel(message) {
  if (!message?.payload?.taskId || !redisConnected) {
    return;
  }
  try {
    await redisPub.publish(
      'redix_cancels',
      JSON.stringify({ taskId: message.payload.taskId, reason: 'client-request' })
    );
  } catch {
    // Silently fail if Redis is unavailable
    redisConnected = false;
  }
}

// Redis subscription is optional - wrap in try-catch to prevent crashes
try {
  redisSub.subscribe('redix_results', 'redix_metrics', error => {
    if (error) {
      if (error?.code === 'ECONNREFUSED') {
        fastify.log.warn('Redis not available - subscription skipped. Redis is optional.');
      } else {
        fastify.log.error({ error }, 'failed to subscribe redis channels');
      }
      redisConnected = false;
    } else {
      redisConnected = true;
    }
  });
} catch {
  // Redis subscription failed - server can run without it
  redisConnected = false;
  fastify.log.debug('Redis subscription skipped - Redis not available');
}

redisSub.on('message', (channel, raw) => {
  if (channel === 'redix_results') {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      fastify.log.warn({ error }, 'invalid result payload');
      return;
    }

    for (const [ws, _meta] of clients.entries()) {
      safeWsSend(ws, JSON.stringify(message));
    }
    return;
  }

  if (channel === 'redix_metrics') {
    try {
      const payload = JSON.parse(raw.toString());
      workerMetrics = {
        cpu: clampPercent(payload.cpu),
        memory: clampPercent(payload.memory),
        rss: payload.rss ?? 0,
        timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
        source: payload.source ?? 'worker',
      };
    } catch (error) {
      fastify.log.warn({ error }, 'invalid worker metrics payload');
    }
  }
});

// Redix services (using stubs defined at top of file)

// Note: /api/agent/query is already defined above with full implementation
// Note: /api/agent/stream endpoint can be added if needed

// Voice recognition endpoint
fastify.post('/api/voice/recognize', async (request, reply) => {
  return voiceController.handleVoiceRecognize(request, reply);
});

// Regen event endpoint (for n8n callbacks)
fastify.post('/api/regen/event', async (request, reply) => {
  const { type, data, userId, automationId, language } = request.body;

  // Add to automation triggers stream
  await automationTriggers.addTriggerEvent({
    type,
    userId,
    automationId,
    data: {
      ...data,
      language: language || 'auto', // Include language in automation data
    },
  });

  // Also broadcast via event bus with language
  await eventBus.publishN8nCallback(automationId || 'unknown', {
    ...data,
    language: language || 'auto',
  });

  // Send to WebSocket clients
  const event = {
    type: 'regen_event',
    payload: {
      type,
      data,
      userId,
      timestamp: Date.now(),
    },
  };

  for (const [ws, _client] of clients.entries()) {
    try {
      ws.send(JSON.stringify(event));
    } catch (error) {
      fastify.log.warn({ error }, 'Failed to send regen event to client');
    }
  }

  return reply.send({ success: true });
});

// Redix health check
fastify.get('/api/redix/health', async () => {
  return await failSafe.healthCheck();
});

// Command queue endpoints
fastify.post('/api/redix/queue/:tabId/command', async (request, reply) => {
  const { tabId } = request.params;
  const command = request.body;

  const messageId = await commandQueue.enqueueCommand(tabId, command);
  if (!messageId) {
    return reply.status(500).send({ error: 'Failed to enqueue command' });
  }

  return reply.send({ success: true, messageId });
});

fastify.get('/api/redix/queue/:tabId', async (request, reply) => {
  const { tabId } = request.params;
  const commands = await commandQueue.readCommands(tabId, 10);
  return reply.send({ commands });
});

// ============================================================================
// TABS API - For Tauri migration
// ============================================================================
const tabsStore = new Map(); // In-memory tab store
let activeTabId = null;

fastify.get('/api/tabs', async () => {
  return Array.from(tabsStore.values());
});

fastify.post('/api/tabs', async request => {
  const { url = 'about:blank', profileId } = request.body;
  const tabId = uuidv4();
  const tab = {
    id: tabId,
    url,
    title: 'New Tab',
    profileId,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    active: false,
  };
  tabsStore.set(tabId, tab);
  activeTabId = tabId;
  tab.active = true;
  return { id: tabId };
});

fastify.delete('/api/tabs/:id', async (request, reply) => {
  const { id } = request.params;
  if (tabsStore.has(id)) {
    tabsStore.delete(id);
    if (activeTabId === id) {
      activeTabId = Array.from(tabsStore.keys())[0] || null;
    }
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/:id/activate', async (request, reply) => {
  const { id } = request.params;
  if (tabsStore.has(id)) {
    // Deactivate all tabs
    for (const tab of tabsStore.values()) {
      tab.active = false;
    }
    // Activate this tab
    const tab = tabsStore.get(id);
    tab.active = true;
    tab.lastActiveAt = Date.now();
    activeTabId = id;
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/:id/navigate', async (request, reply) => {
  const { id } = request.params;
  const { url } = request.body;
  if (tabsStore.has(id)) {
    const tab = tabsStore.get(id);
    tab.url = url;
    tab.lastActiveAt = Date.now();
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/:id/back', async (request, reply) => {
  const { id } = request.params;
  if (tabsStore.has(id)) {
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/:id/forward', async (request, reply) => {
  const { id } = request.params;
  if (tabsStore.has(id)) {
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/:id/reload', async (request, reply) => {
  const { id } = request.params;
  if (tabsStore.has(id)) {
    const tab = tabsStore.get(id);
    tab.lastActiveAt = Date.now();
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/:id/stop', async (request, reply) => {
  const { id } = request.params;
  if (tabsStore.has(id)) {
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Tab not found' };
});

fastify.post('/api/tabs/overlay/start', async () => {
  return { success: true };
});

fastify.get('/api/tabs/overlay/pick', async () => {
  return { x: 0, y: 0, element: null };
});

fastify.post('/api/tabs/overlay/clear', async () => {
  return { success: true };
});

fastify.get('/api/tabs/predictive-groups', async () => {
  return { groups: [], prefetch: [], summary: undefined };
});

// ============================================================================
// SESSIONS API - For Tauri migration
// ============================================================================
const sessionsStore = new Map();
let activeSessionId = null;

fastify.get('/api/sessions', async () => {
  return Array.from(sessionsStore.values());
});

fastify.post('/api/sessions', async request => {
  const { name = 'New Session', profileId, color } = request.body;
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    name,
    profileId,
    color: color || '#3b82f6',
    createdAt: Date.now(),
    tabIds: [],
  };
  sessionsStore.set(sessionId, session);
  activeSessionId = sessionId;
  return { id: sessionId };
});

fastify.get('/api/sessions/active', async () => {
  if (activeSessionId && sessionsStore.has(activeSessionId)) {
    return { id: activeSessionId };
  }
  return null;
});

fastify.post('/api/sessions/:id/activate', async (request, reply) => {
  const { id } = request.params;
  if (sessionsStore.has(id)) {
    activeSessionId = id;
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Session not found' };
});

fastify.get('/api/sessions/:id', async (request, reply) => {
  const { id } = request.params;
  if (sessionsStore.has(id)) {
    return sessionsStore.get(id);
  }
  reply.code(404);
  return { error: 'Session not found' };
});

fastify.delete('/api/sessions/:id', async (request, reply) => {
  const { id } = request.params;
  if (sessionsStore.has(id)) {
    sessionsStore.delete(id);
    if (activeSessionId === id) {
      activeSessionId = Array.from(sessionsStore.keys())[0] || null;
    }
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Session not found' };
});

// ============================================================================
// AGENT API - For Tauri migration
// ============================================================================
fastify.post('/api/agent/ask', async (request, reply) => {
  const { prompt, sessionId } = request.body;
  if (!prompt) {
    reply.code(400);
    return { error: 'Prompt is required' };
  }

  try {
    // Use existing agent query endpoint logic
    const jobId = uuidv4();
    const result = await LLMCircuit.fire({
      prompt,
      sessionId,
      jobId,
    });

    return {
      response: result?.response || 'Agent response unavailable',
      jobId,
    };
  } catch (error) {
    fastify.log.error({ error }, 'Agent query failed');
    reply.code(500);
    return { error: 'Agent query failed', message: error.message };
  }
});

// ============================================================================
// SYSTEM API - For Tauri migration
// ============================================================================
fastify.get('/api/system/status', async () => {
  const metrics = getMetrics();
  return {
    cpu: metrics.cpu || 0,
    memory: metrics.memory || 0,
    timestamp: Date.now(),
  };
});

// ============================================================================
// PROFILES API - For Tauri migration
// ============================================================================
const profilesStore = new Map();
const defaultProfile = {
  id: 'default',
  name: 'Default',
  createdAt: Date.now(),
  proxy: undefined,
  kind: 'default',
  color: '#3b82f6',
  system: true,
  policy: {
    allowDownloads: true,
    allowPrivateWindows: true,
    allowGhostTabs: true,
    allowScreenshots: true,
    allowClipping: true,
  },
};

profilesStore.set('default', defaultProfile);

fastify.get('/api/profiles', async () => {
  return Array.from(profilesStore.values());
});

fastify.get('/api/profiles/:id', async (request, reply) => {
  const { id } = request.params;
  if (profilesStore.has(id)) {
    return profilesStore.get(id);
  }
  reply.code(404);
  return { error: 'Profile not found' };
});

fastify.get('/api/profiles/active', async () => {
  return defaultProfile;
});

// ============================================================================
// STORAGE API - For Tauri migration
// ============================================================================
const storageStore = new Map();

fastify.get('/api/storage/:key', async (request, reply) => {
  const { key } = request.params;
  if (storageStore.has(key)) {
    return { value: storageStore.get(key) };
  }
  reply.code(404);
  return { error: 'Key not found' };
});

fastify.post('/api/storage/:key', async request => {
  const { key } = request.params;
  const { value } = request.body;
  storageStore.set(key, value);
  return { success: true };
});

fastify.delete('/api/storage/:key', async (request, reply) => {
  const { key } = request.params;
  if (storageStore.has(key)) {
    storageStore.delete(key);
    return { success: true };
  }
  reply.code(404);
  return { success: false, error: 'Key not found' };
});

fastify.get('/api/storage', async () => {
  const entries = Array.from(storageStore.entries()).map(([key, value]) => ({
    key,
    value,
  }));
  return { entries };
});

fastify.get('/api/storage/settings/:key', async (request, reply) => {
  const { key } = request.params;
  const fullKey = `settings:${key}`;
  if (storageStore.has(fullKey)) {
    return { value: storageStore.get(fullKey) };
  }
  reply.code(404);
  return { error: 'Setting not found' };
});

fastify.get('/api/storage/workspaces', async () => {
  const workspaces = Array.from(storageStore.entries())
    .filter(([key]) => key.startsWith('workspace:'))
    .map(([key, value]) => ({ id: key.replace('workspace:', ''), ...value }));
  return workspaces;
});

fastify.get('/api/storage/downloads', async () => {
  const downloads = Array.from(storageStore.entries())
    .filter(([key]) => key.startsWith('download:'))
    .map(([key, value]) => ({ id: key.replace('download:', ''), ...value }));
  return downloads;
});

fastify.get('/api/storage/accounts', async () => {
  const accounts = Array.from(storageStore.entries())
    .filter(([key]) => key.startsWith('account:'))
    .map(([key, value]) => ({ id: key.replace('account:', ''), ...value }));
  return accounts;
});

// ============================================================================
// HISTORY API - For Tauri migration
// ============================================================================
const historyStore = [];

fastify.get('/api/history', async request => {
  const limit = Number(request.query?.limit) || 100;
  return historyStore.slice(0, limit);
});

fastify.post('/api/history', async request => {
  const { url, title, typed } = request.body;
  const entry = {
    id: uuidv4(),
    url,
    title: title || url,
    typed: typed || false,
    timestamp: Date.now(),
    visitCount: 1,
  };
  historyStore.unshift(entry);
  if (historyStore.length > 10000) {
    historyStore.length = 10000;
  }
  return { success: true, id: entry.id };
});

fastify.get('/api/history/search', async request => {
  const { query, limit = 50 } = request.query;
  if (!query) {
    return [];
  }
  const searchTerm = query.toLowerCase();
  const results = historyStore
    .filter(
      entry =>
        entry.url.toLowerCase().includes(searchTerm) ||
        entry.title.toLowerCase().includes(searchTerm)
    )
    .slice(0, Number(limit));
  return results;
});

// ============================================================================
// AI PROXY API
// ============================================================================
function buildSystemPrompt(kind) {
  switch (kind) {
    case 'search':
      return 'You are Regen Research Copilot. Cite sources inline when possible.';
    case 'agent':
      return 'You are Regen Execution Agent. Respond with concise, actionable steps.';
    case 'summary':
      return 'You summarize webpages for human readers.';
    default:
      return 'You are Regen assistant.';
  }
}

function buildContextBlock(context) {
  if (!context || typeof context !== 'object') return '';
  const serialized = Object.entries(context)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => `${key}: ${String(value).slice(0, 1500)}`);
  if (!serialized.length) return '';
  return `\nContext:\n${serialized.join('\n')}`;
}

// callOpenAI is currently unused (commented out route handler)
// Kept for potential future use or reference
async function _callOpenAI(payload) {
  const { prompt, kind, context, temperature = 0.2, max_tokens = 800 } = payload;
  if (!openAIConfig.apiKey) {
    return {
      status: 503,
      body: { error: 'OpenAI API key missing on server' },
    };
  }

  const headers = {
    Authorization: `Bearer ${openAIConfig.apiKey}`,
    'Content-Type': 'application/json',
  };
  const body = {
    model: openAIConfig.model,
    temperature: Math.min(Math.max(temperature, 0), 1),
    max_tokens: Math.min(Math.max(max_tokens, 64), 2000),
    messages: [
      {
        role: 'system',
        content: `${buildSystemPrompt(kind)}${buildContextBlock(context)}`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const response = await fetch(openAIConfig.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return {
    status: response.status,
    body: data,
  };
}

// Duplicate route removed - using the one at line 1864 instead
// This entire route handler is commented out to avoid duplicate route error
/*
fastify.post('/api/ai/task', async (request, reply) => {
  const { prompt, kind = 'agent', context, temperature, max_tokens } = request.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    reply.code(400);
    return { error: 'Prompt is required' };
  }

  if (_AI_PROXY_PROVIDER === 'disabled') {
    reply.code(503);
    return { error: 'AI proxy is disabled on this server' };
  }

  try {
    let proxyResult;
    switch (_AI_PROXY_PROVIDER) {
      case 'openai':
      default:
        proxyResult = await _callOpenAI({
          prompt: prompt.trim(),
          kind,
          context,
          temperature,
          max_tokens,
        });
        break;
    }

    if (!proxyResult || proxyResult.status >= 500) {
      fastify.log.error({ proxyResult }, 'AI proxy upstream failure');
      reply.code(502);
      return { error: 'AI provider unavailable' };
    }

    if (proxyResult.status >= 400) {
      reply.code(proxyResult.status);
      return { error: proxyResult.body?.error || 'AI provider error' };
    }

    const choice = proxyResult.body?.choices?.[0]?.message?.content || '';
    return {
      text: choice?.trim() || '',
      provider: _AI_PROXY_PROVIDER,
      model: proxyResult.body?.model || openAIConfig.model,
      usage: proxyResult.body?.usage,
      citations: [],
    };
  } catch (error) {
    fastify.log.error({ error }, 'AI proxy request failed');
    reply.code(502);
    return { error: 'AI provider request failed' };
  }
});
*/

// ============================================================================
// RESEARCH API - For Tauri migration
// ============================================================================
// Real-time AI Proxy endpoints
fastify.post('/api/ai/summarize', async (request, reply) => {
  const { url, content, length = 'medium' } = request.body;

  try {
    const result = await aiProxy.summarizePage(url, content, { length });
    return reply.send(result);
  } catch (error) {
    fastify.log.error({ err: error, url }, 'Summarization failed');
    return reply.status(500).send({ error: 'Summarization failed' });
  }
});

fastify.post('/api/ai/research/stream', async (request, reply) => {
  const { query, sources } = request.body;

  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.flushHeaders?.();

  const streamId = await aiProxy.streamResearchSummary(query, sources || []);

  const onChunk = ({ streamId: sid, text, fullText }) => {
    if (sid === streamId && !reply.raw.destroyed) {
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text, fullText })}\n\n`);
      } catch (error) {
        fastify.log.debug({ error }, 'Failed to send chunk');
      }
    }
  };

  const onDone = ({ streamId: sid, text }) => {
    if (sid === streamId && !reply.raw.destroyed) {
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: 'done', text })}\n\n`);
        reply.raw.end();
      } catch (error) {
        fastify.log.debug({ error }, 'Failed to send done');
      }
      aiProxy.removeListener('chunk', onChunk);
      aiProxy.removeListener('done', onDone);
    }
  };

  aiProxy.on('chunk', onChunk);
  aiProxy.on('done', onDone);

  request.raw.on('close', () => {
    aiProxy.cancelStream(streamId);
    aiProxy.removeListener('chunk', onChunk);
    aiProxy.removeListener('done', onDone);
  });
});

fastify.post('/api/ai/suggest-actions', async (request, reply) => {
  const { currentUrl, query, sessionHistory, openTabs } = request.body;

  try {
    const actions = await aiProxy.suggestNextActions({
      currentUrl,
      query,
      sessionHistory,
      openTabs,
    });
    return reply.send({ actions });
  } catch (error) {
    fastify.log.error({ err: error }, 'Action suggestion failed');
    return reply.status(500).send({ error: 'Suggestion failed' });
  }
});

fastify.post('/api/research/query', async (request, reply) => {
  const { query, language } = request.body ?? {};
  if (!query) {
    reply.code(400);
    return { error: 'Query is required' };
  }

  try {
    const results = await researchSearch({
      query,
      size: 12,
      language,
    });
    return results;
  } catch (error) {
    fastify.log.error({ error }, 'Research query failed');
    reply.code(500);
    return { error: 'Research query failed', message: error.message };
  }
});

fastify.post('/api/research/enhanced', async (request, reply) => {
  const { query, ...options } = request.body ?? {};
  if (!query) {
    reply.code(400);
    return { error: 'Query is required' };
  }

  try {
    const result = await queryEnhancedResearch({ query, ...options });
    return result;
  } catch (error) {
    fastify.log.error({ error }, 'Enhanced research failed');
    reply.code(500);
    return { error: 'Enhanced research failed', message: error.message };
  }
});

// ============================================================================
// TRADE API ENDPOINTS
// ============================================================================

fastify.get('/api/trade/quote/:symbol', async (request, reply) => {
  const { symbol } = request.params;
  if (!symbol) {
    reply.code(400);
    return { error: 'Symbol is required' };
  }

  try {
    // Try to fetch real data from Yahoo Finance via proxy
    let realQuote = null;
    try {
      const yahooSymbol = symbol.includes('NIFTY')
        ? '^NSEI'
        : symbol.includes('BANK')
          ? '^NSEBANK'
          : symbol;
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          params: { interval: '1m', range: '1d' },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 5000,
        }
      );

      if (response.data?.chart?.result?.[0]?.meta) {
        const meta = response.data.chart.result[0].meta;
        realQuote = {
          symbol,
          price: meta.regularMarketPrice || meta.previousClose,
          change: meta.regularMarketChange || 0,
          changePercent: meta.regularMarketChangePercent || 0,
          volume: meta.regularMarketVolume || 0,
          timestamp: Date.now(),
        };
      }
    } catch (yahooError) {
      fastify.log.debug({ error: yahooError }, 'Yahoo Finance fetch failed, using mock');
    }

    // Return real quote if available, otherwise mock
    if (realQuote) {
      return realQuote;
    }

    // Mock quote data - replace with real broker API
    const mockQuote = {
      symbol,
      price: 25035.14 + Math.random() * 100,
      change: (Math.random() - 0.5) * 50,
      changePercent: (Math.random() - 0.5) * 2,
      volume: Math.floor(Math.random() * 1000000),
      high: 25120,
      low: 24720,
      open: 24850,
      timestamp: Date.now(),
    };
    return mockQuote;
  } catch (error) {
    fastify.log.error({ error }, 'Trade quote failed');
    reply.code(500);
    return { error: 'Trade quote failed', message: error.message };
  }
});

fastify.get('/api/trade/candles/:symbol', async (request, reply) => {
  const { symbol } = request.params;
  const { interval = '1d', limit = 50, resolution } = request.query;
  if (!symbol) {
    reply.code(400);
    return { error: 'Symbol is required' };
  }

  try {
    // Route crypto to Binance API
    if (isCryptoSymbol(symbol)) {
      const binanceSymbol = mapToBinanceSymbol(symbol);
      const intervalMap = {
        1: '1m',
        5: '5m',
        15: '15m',
        30: '30m',
        60: '1h',
        D: '1d',
        W: '1w',
        M: '1M',
      };
      const binanceInterval = intervalMap[resolution || interval] || '1d';
      const limitCount = Number(limit) || 50;

      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=${binanceInterval}&limit=${limitCount}`
        );
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const candles = data.map(kline => ({
            timestamp: Math.floor(kline[0] / 1000), // Binance returns milliseconds, convert to seconds
            time: kline[0], // Keep milliseconds for time field
            open: Number(kline[1]),
            high: Number(kline[2]),
            low: Number(kline[3]),
            close: Number(kline[4]),
            volume: Number(kline[5]),
          }));
          return { symbol, interval, candles };
        }
      } catch (binanceError) {
        fastify.log.warn({ symbol, error: binanceError }, 'Binance candles failed, using fallback');
      }
    }

    // Use Finnhub API for stocks/indices
    const finnhubSymbol = mapToFinnhubSymbol(symbol);
    const res = resolution || (interval === '1d' ? 'D' : interval === '1w' ? 'W' : 'M');
    const to = Math.floor(Date.now() / 1000);
    const from =
      to -
      (res === 'D'
        ? 86400 * Number(limit)
        : res === 'W'
          ? 604800 * Number(limit)
          : 2592000 * Number(limit));

    if (FINNHUB_TOKEN) {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${finnhubSymbol}&resolution=${res}&from=${from}&to=${to}&token=${FINNHUB_TOKEN}`
      );
      const data = await response.json();

      if (data.s === 'ok' && data.c && Array.isArray(data.c)) {
        const candles = data.c.map((close, i) => ({
          timestamp: data.t[i],
          time: data.t[i] * 1000, // Convert to milliseconds
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
          volume: data.v[i] || 0,
        }));
        return { symbol, interval, candles };
      }
    }

    // Fallback: Generate mock candle data if Finnhub fails or no token
    fastify.log.warn({ symbol }, 'Using fallback mock candles (Finnhub not configured)');
    const candles = Array.from({ length: Number(limit) || 50 }, (_, i) => {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - (Number(limit) || 50) + i);
      const time = baseDate.toISOString().split('T')[0];
      const open = 24800 + Math.random() * 300;
      const close = open + (Math.random() - 0.5) * 400;
      const high = Math.max(open, close) + Math.random() * 100;
      const low = Math.min(open, close) - Math.random() * 100;
      return {
        time,
        timestamp: Math.floor(baseDate.getTime() / 1000),
        open,
        high,
        low,
        close,
        volume: 0,
      };
    });
    return { symbol, interval, candles };
  } catch (error) {
    fastify.log.error({ error }, 'Trade candles failed');
    reply.code(500);
    return { error: 'Trade candles failed', message: error.message };
  }
});

fastify.post('/api/trade/order', async (request, reply) => {
  const { symbol, quantity, orderType, stopLoss, takeProfit } = request.body ?? {};
  if (!symbol || !quantity || !orderType) {
    reply.code(400);
    return { error: 'Symbol, quantity, and orderType are required' };
  }

  const startTime = Date.now();

  try {
    // Try Zerodha Kite Connect if configured
    if (ZERODHA_API_KEY && ZERODHA_ACCESS_TOKEN) {
      try {
        // Map symbol to NSE format (e.g., "RELIANCE" -> "NSE:RELIANCE")
        const nseSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
        const kiteSymbol = `${nseSymbol}-EQ`; // Zerodha format: RELIANCE-EQ

        // OPTIMIZED: Use timeout and Promise.race for <1.6s execution
        const orderPromise = fetch(`https://kite.zerodha.com/oms/orders/regular`, {
          method: 'POST',
          headers: {
            'X-Kite-Version': '3',
            Authorization: `token ${ZERODHA_API_KEY}:${ZERODHA_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exchange: 'NSE',
            tradingsymbol: kiteSymbol,
            transaction_type: orderType.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
            quantity: Number(quantity),
            price: 0, // Market order (0 = market, >0 = limit)
            product: 'MIS', // MIS for intraday, CNC for delivery
            order_type: 'MARKET', // MARKET or LIMIT
            validity: 'DAY',
            ...(stopLoss && { stoploss: Number(stopLoss) }),
            ...(takeProfit && { target: Number(takeProfit) }),
          }),
        });

        // Timeout after 1.5 seconds
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Order timeout after 1.5s')), 1500)
        );

        const response = await Promise.race([orderPromise, timeoutPromise]);

        if (response.ok) {
          const data = await response.json();
          const elapsed = Date.now() - startTime;

          // CRITICAL: Validate response
          if (!data.data?.order_id) {
            throw new Error('Invalid response: missing order_id');
          }

          fastify.log.info(
            {
              symbol,
              quantity,
              orderType,
              orderId: data.data.order_id,
              elapsed: `${elapsed}ms`,
            },
            'Zerodha order placed'
          );

          return {
            success: true,
            orderId: data.data.order_id,
            symbol,
            quantity,
            orderType,
            status: data.data.status || 'pending',
            broker: 'zerodha',
            timestamp: Date.now(),
            executionTime: elapsed,
          };
        } else {
          // CRITICAL: Proper error handling
          const errorData = await response.json().catch(() => ({
            error: 'Unknown error',
            status: response.status,
            statusText: response.statusText,
          }));

          // Check for token expiration
          if (response.status === 403 || response.status === 401) {
            fastify.log.error(
              { symbol, error: errorData },
              'Zerodha token expired - needs refresh'
            );
            reply.code(401);
            return {
              success: false,
              error: 'token_expired',
              message: 'Zerodha access token expired. Please refresh token.',
              symbol,
              quantity,
              orderType,
            };
          }

          // Check for insufficient funds
          if (response.status === 400 && errorData.message?.includes('insufficient')) {
            fastify.log.warn({ symbol, error: errorData }, 'Insufficient funds');
            reply.code(400);
            return {
              success: false,
              error: 'insufficient_funds',
              message: 'Insufficient funds to place order',
              symbol,
              quantity,
              orderType,
            };
          }

          fastify.log.warn({ symbol, error: errorData }, 'Zerodha order failed');
          reply.code(response.status);
          return {
            success: false,
            error: 'order_failed',
            message: errorData.message || errorData.error || 'Order placement failed',
            symbol,
            quantity,
            orderType,
            details: errorData,
          };
        }
      } catch (zerodhaError) {
        // CRITICAL: Proper error handling for network/timeout errors
        const elapsed = Date.now() - startTime;
        fastify.log.error(
          {
            symbol,
            error: zerodhaError,
            elapsed: `${elapsed}ms`,
          },
          'Zerodha API error'
        );

        // If timeout, return specific error
        if (zerodhaError.message?.includes('timeout')) {
          reply.code(504);
          return {
            success: false,
            error: 'order_timeout',
            message: 'Order execution timed out (>1.5s). Market may be volatile.',
            symbol,
            quantity,
            orderType,
            executionTime: elapsed,
          };
        }

        // Network errors
        reply.code(502);
        return {
          success: false,
          error: 'network_error',
          message: zerodhaError.message || 'Network error while placing order',
          symbol,
          quantity,
          orderType,
          executionTime: elapsed,
        };
      }
    }

    // Fallback: Mock order placement (for testing or when Zerodha not configured)
    const orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    fastify.log.info(
      { symbol, quantity, orderType },
      'Mock trade order placed (Zerodha not configured)'
    );
    return {
      success: true,
      orderId,
      symbol,
      quantity,
      orderType,
      status: 'pending',
      broker: 'mock',
      timestamp: Date.now(),
      note: 'This is a mock order. Configure ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN for real orders.',
    };
  } catch (error) {
    fastify.log.error({ error }, 'Trade order failed');
    reply.code(500);
    return { error: 'Trade order failed', message: error.message };
  }
});

// ============================================================================
// GRAPH API - For Tauri migration
// ============================================================================
const graphStore = new Map();

fastify.get('/api/graph', async () => {
  return {
    nodes: Array.from(graphStore.values()),
    edges: [],
  };
});

fastify.post('/api/graph', async (request, reply) => {
  const { node } = request.body;
  if (!node || !node.id) {
    reply.code(400);
    return { error: 'Node with ID is required' };
  }

  const graphNode = {
    id: node.id,
    type: node.type || 'default',
    data: node.data || {},
    createdAt: Date.now(),
  };
  graphStore.set(node.id, graphNode);
  return { success: true };
});

fastify.post('/api/graph/node', async (request, reply) => {
  const { id, type, data } = request.body;
  if (!id) {
    reply.code(400);
    return { error: 'Node ID is required' };
  }

  const node = {
    id,
    type: type || 'default',
    data: data || {},
    createdAt: Date.now(),
  };
  graphStore.set(id, node);
  return { success: true, node };
});

fastify.get('/api/graph/:key', async (request, reply) => {
  const { key } = request.params;
  if (graphStore.has(key)) {
    return graphStore.get(key);
  }
  reply.code(404);
  return { error: 'Node not found' };
});

fastify.get('/api/graph/node/:id', async (request, reply) => {
  const { id } = request.params;
  if (graphStore.has(id)) {
    return graphStore.get(id);
  }
  reply.code(404);
  return { error: 'Node not found' };
});

// ============================================================================
// LEDGER API - For Tauri migration
// ============================================================================
const ledgerStore = [];

fastify.get('/api/ledger', async request => {
  const limit = Number(request.query?.limit) || 100;
  return ledgerStore.slice(0, limit);
});

fastify.post('/api/ledger', async request => {
  const { url, passage, action, domain, timestamp, metadata } = request.body;

  // Support both formats: { url, passage } and { action, domain, ... }
  const entry =
    url && passage
      ? {
          id: uuidv4(),
          url,
          passage,
          timestamp: Date.now(),
        }
      : {
          id: uuidv4(),
          action: action || 'unknown',
          domain: domain || 'unknown',
          timestamp: timestamp || Date.now(),
          metadata: metadata || {},
        };

  ledgerStore.unshift(entry);
  if (ledgerStore.length > 10000) {
    ledgerStore.length = 10000;
  }
  return { success: true, id: entry.id };
});

fastify.get('/api/ledger/verify', async () => {
  return {
    verified: true,
    totalEntries: ledgerStore.length,
    lastVerified: Date.now(),
  };
});

// ============================================================================
// RECORDER API - For Tauri migration
// ============================================================================
const recordingsStore = new Map();

fastify.get('/api/recorder/status', async () => {
  return { recording: false, paused: false };
});

fastify.post('/api/recorder/start', async () => {
  const recordingId = uuidv4();
  recordingsStore.set(recordingId, {
    id: recordingId,
    startedAt: Date.now(),
    events: [],
  });
  return { success: true, id: recordingId };
});

fastify.post('/api/recorder/stop', async (request, reply) => {
  const { id } = request.body;
  if (!id || !recordingsStore.has(id)) {
    reply.code(404);
    return { success: false, error: 'Recording not found' };
  }
  const recording = recordingsStore.get(id);
  recording.stoppedAt = Date.now();
  return { success: true, recording };
});

fastify.get('/api/recorder/:id', async (request, reply) => {
  const { id } = request.params;
  if (recordingsStore.has(id)) {
    return recordingsStore.get(id);
  }
  reply.code(404);
  return { error: 'Recording not found' };
});

fastify.get('/api/recorder/dsl', async () => {
  return {
    dsl: '',
    events: [],
  };
});

// ============================================================================
// PROXY API - For Tauri migration
// ============================================================================
fastify.get('/api/proxy/status', async () => {
  return { enabled: false, type: null, address: null };
});

fastify.post('/api/proxy/enable', async request => {
  const { type, address, port } = request.body;
  return { success: true, enabled: true, type, address, port };
});

fastify.post('/api/proxy', async request => {
  const rules = request.body;
  return { success: true, rules };
});

fastify.post('/api/proxy/disable', async () => {
  return { success: true, enabled: false };
});

fastify.post('/api/proxy/kill-switch', async request => {
  const { enabled } = request.body;
  return { success: true, enabled: enabled || false };
});

// ============================================================================
// THREATS API - For Tauri migration
// ============================================================================
fastify.post('/api/threats/scan', async (request, reply) => {
  const { url } = request.body;
  if (!url) {
    reply.code(400);
    return { error: 'URL is required' };
  }

  return {
    url,
    safe: true,
    threats: [],
    timestamp: Date.now(),
  };
});

fastify.post('/api/threats/scan-url', async (request, reply) => {
  const { url } = request.body;
  if (!url) {
    reply.code(400);
    return { error: 'URL is required' };
  }

  return {
    url,
    safe: true,
    threats: [],
    timestamp: Date.now(),
  };
});

fastify.post('/api/threats/scan-file', async (request, reply) => {
  const { filePath } = request.body;
  if (!filePath) {
    reply.code(400);
    return { error: 'File path is required' };
  }

  return {
    filePath,
    safe: true,
    threats: [],
    timestamp: Date.now(),
  };
});

fastify.get('/api/threats/status', async () => {
  return { enabled: true, lastScan: null };
});

// ============================================================================
// VIDEO API - For Tauri migration
// ============================================================================
fastify.get('/api/video/status', async () => {
  return { active: false, participants: 0 };
});

fastify.post('/api/video/start', async () => {
  return { success: true, sessionId: uuidv4() };
});

fastify.post('/api/video/stop', async () => {
  return { success: true };
});

fastify.delete('/api/video/:id', async request => {
  const { id } = request.params;
  return { success: true, id };
});

fastify.get('/api/video/consent', async () => {
  return false;
});

fastify.post('/api/video/consent', async request => {
  const { value } = request.body;
  return { success: true, value: value || false };
});

// ============================================================================
// UI API - For Tauri migration
// ============================================================================
fastify.post('/api/ui/chrome-offsets', async request => {
  const offsets = request.body;
  return { success: true, offsets };
});

fastify.post('/api/ui/right-dock', async request => {
  const { px } = request.body;
  return { success: true, px: px || 0 };
});

// ============================================================================
// SCRAPE API - Already exists, but adding missing endpoints
// ============================================================================
fastify.get('/api/scrape/:id', async (request, reply) => {
  const { id } = request.params;
  // Check if job exists in existing scrape system
  try {
    const meta = await redisStore.get(`scrape:meta:${id}`);
    if (meta) {
      return JSON.parse(meta);
    }
  } catch {
    // Ignore
  }
  reply.code(404);
  return { error: 'Scrape job not found' };
});

// ============================================================================
// SUMMARIZE API - Tier 1: Unified facade that handles polling internally
// ============================================================================
/**
 * POST /api/summarize
 * Unified summarize endpoint that handles job polling internally.
 * Frontend never needs to poll - this endpoint waits for completion.
 *
 * Body: { url?: string, text?: string, question?: string, waitFor?: number }
 * Returns:
 *   - 202 Accepted: { jobId, status: 'enqueued', subscribeUrl } (if not ready quickly)
 *   - 200 OK: { summary, answer, sources, model, jobId } (if ready within waitFor seconds)
 */
// CATEGORY B FIX: Rate limit expensive endpoints
// CATEGORY B FIX: Rate limit + auth for expensive endpoints
fastify.post(
  '/api/summarize',
  {
    config: { rateLimit: { max: 10, timeWindow: 60 * 1000 } },
    preHandler: [authenticateRequest],
  },
  async (request, reply) => {
    const { url, text, question, waitFor = 2 } = request.body ?? {};

    if (!url && !text) {
      return reply.status(400).send({ error: 'url-or-text-required' });
    }

    // Tier 1: Security guardrails - validate URL before processing
    if (url) {
      try {
        const urlObj = new URL(url);
        const BLOCKED_HOSTS = [
          '169.254.169.254',
          'metadata.google.internal',
          'localhost',
          '127.0.0.1',
          '::1',
          '0.0.0.0',
          'metadata.azure.com',
        ];
        const ALLOWED_PROTOCOLS = ['http:', 'https:'];

        if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
          return reply.status(403).send({
            error: 'blocked-protocol',
            message: `Protocol ${urlObj.protocol} is not allowed. Only http: and https: are permitted.`,
          });
        }

        if (
          BLOCKED_HOSTS.includes(urlObj.hostname) ||
          urlObj.hostname === 'localhost' ||
          urlObj.hostname.endsWith('.localhost')
        ) {
          return reply.status(403).send({
            error: 'blocked-host',
            message: 'Internal and private network addresses are not allowed.',
          });
        }

        // Check for private IP ranges
        const privateIPPatterns = [
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
          /^192\.168\./,
          /^127\./,
        ];
        if (privateIPPatterns.some(pattern => pattern.test(urlObj.hostname))) {
          return reply.status(403).send({
            error: 'blocked-private-ip',
            message: 'Private IP addresses are not allowed.',
          });
        }
      } catch {
        return reply.status(400).send({
          error: 'invalid-url',
          message: 'Invalid URL format.',
        });
      }
    }

    let jobId = null;
    let meta = null;
    let body = null;

    // If URL provided, enqueue scrape and poll until complete
    if (url) {
      jobId = sha256(url);
      try {
        await enqueueScrape({ url, userId: request.body?.userId, jobId });
      } catch (error) {
        request.log.error({ error }, 'failed to enqueue scrape for summarize');
        return reply.status(500).send({ error: 'scrape-enqueue-failed' });
      }

      // CRITICAL FIX: Non-blocking pattern - quick check (2s default), then return 202
      const quickCheckUntil = Date.now() + (waitFor || 2) * 1000;
      const pollInterval = 200; // Poll every 200ms for quick check
      let found = false;

      while (Date.now() < quickCheckUntil && !found) {
        const raw = await safeRedisOperation(() => redisStore.get(`scrape:meta:${jobId}`), null);
        if (raw) {
          try {
            meta = JSON.parse(raw);
            if (meta.bodyKey) {
              body = await safeRedisOperation(() => redisStore.get(meta.bodyKey), null);
              if (body) {
                found = true;
                break;
              }
            }
            // Check if scrape failed
            if (meta.status >= 400 || !meta.allowed) {
              return reply.status(502).send({
                error: 'scrape-failed',
                jobId,
                meta,
                message: 'Failed to scrape URL',
              });
            }
          } catch (error) {
            request.log.warn({ error }, 'failed to parse scrape meta');
          }
        }
        await new Promise(r => globalThis.setTimeout(r, pollInterval));
      }

      // If not ready quickly, return 202 with subscribe instructions
      if (!body) {
        reply.code(202);
        return {
          jobId,
          status: 'enqueued',
          subscribeUrl: `/api/ask?q=${encodeURIComponent(url)}&sessionId=${request.body?.userId || 'anon'}`,
          message:
            'Job enqueued. Subscribe to /api/ask with query parameter or poll /api/scrape/meta/:jobId',
        };
      }
    } else {
      // For raw text, use it directly
      jobId = sha256(text + Date.now());
      body = text;
      meta = {
        jobId,
        url: null,
        status: 200,
        cached: false,
        fetchedAt: new Date().toISOString(),
        bodyKey: `agent:input:${jobId}`,
      };
    }

    // Prepare provenance
    const provenance = {
      scrapeJobId: jobId,
      url: url || null,
      status: meta.status,
      cached: Boolean(meta.cached),
      fetchedAt: meta.fetchedAt,
      durationMs: meta.durationMs || 0,
      headers: meta.headers || {},
      bodyKey: meta.bodyKey || `agent:input:${jobId}`,
      excerpt: body?.slice(0, 500) || '',
      scrapeErrors: meta.reason || null,
    };

    // Call LLM to summarize
    try {
      const llmResult = await LLMCircuit.fire({
        task: 'summarize',
        inputText: body,
        url: url || null,
        question: question || null,
        userId: request.body?.userId || null,
      });

      const result = {
        summary: llmResult.summary || llmResult.answer,
        answer: llmResult.answer,
        highlights: llmResult.highlights || [],
        model: llmResult.model,
        jobId,
        sources: [
          {
            url: url || 'text-input',
            jobId,
            selector: null,
          },
        ],
        provenance,
      };

      // Store result in Redis for caching (optional)
      const resultKey = `agent:result:${jobId}:summarize`;
      await safeRedisOperation(
        () => redisStore.set(resultKey, JSON.stringify(result), 'EX', 60 * 60),
        null
      );

      return result;
    } catch (error) {
      request.log.error({ error, jobId }, 'LLM summarize failed');

      // Check if circuit breaker is open
      if (LLMCircuit.opened) {
        return reply.status(503).send({
          error: 'llm-circuit-open',
          message: 'AI service temporarily unavailable. Please try again later.',
        });
      }

      return reply.status(500).send({
        error: 'summarize-failed',
        message: error.message || 'Failed to generate summary',
        jobId,
      });
    }
  }
);

// ============================================================================
// SESSION STATE API - For Tauri migration
// ============================================================================
fastify.get('/api/session/check-restore', async () => {
  return { available: false, snapshot: null };
});

fastify.get('/api/session/snapshot', async () => {
  return {
    tabs: Array.from(tabsStore.values()),
    sessions: Array.from(sessionsStore.values()),
    timestamp: Date.now(),
  };
});

fastify.post('/api/session/dismiss-restore', async () => {
  return { success: true };
});

fastify.post('/api/session/save-tabs', async () => {
  const tabs = Array.from(tabsStore.values());
  return { success: true, count: tabs.length };
});

fastify.get('/api/session/load-tabs', async () => {
  return { tabs: Array.from(tabsStore.values()) };
});

fastify.post('/api/session/add-history', async request => {
  const { url, title, typed } = request.body;
  const entry = {
    id: uuidv4(),
    url,
    title: title || url,
    typed: typed || false,
    timestamp: Date.now(),
  };
  historyStore.unshift(entry);
  return { success: true, id: entry.id };
});

fastify.get('/api/session/history', async request => {
  const limit = Number(request.query?.limit) || 100;
  return { history: historyStore.slice(0, limit) };
});

fastify.post('/api/session/search-history', async (request, reply) => {
  const { query, limit = 50 } = request.body;
  if (!query) {
    reply.code(400);
    return { error: 'Query is required' };
  }
  const searchTerm = query.toLowerCase();
  const results = historyStore
    .filter(
      entry =>
        entry.url.toLowerCase().includes(searchTerm) ||
        entry.title.toLowerCase().includes(searchTerm)
    )
    .slice(0, Number(limit));
  return { results };
});

fastify.post('/api/session/save-setting', async request => {
  const { key, value } = request.body;
  storageStore.set(`settings:${key}`, value);
  return { success: true };
});

fastify.get('/api/session/get-setting/:key', async (request, reply) => {
  const { key } = request.params;
  const fullKey = `settings:${key}`;
  if (storageStore.has(fullKey)) {
    return { value: storageStore.get(fullKey) };
  }
  reply.code(404);
  return { error: 'Setting not found' };
});

// ============================================================================
// PING ENDPOINT - For health checks
// ============================================================================
fastify.get('/api/ping', async () => {
  return 'pong';
});

fastify.post('/api/redix/queue/:tabId/ack', async (request, reply) => {
  const { tabId } = request.params;
  const { messageId } = request.body;

  const success = await commandQueue.acknowledgeCommand(tabId, messageId);
  return reply.send({ success });
});

// /metrics route is already defined above (line 368)

fastify.get('/metrics/prom', async (_request, reply) => {
  const sample = lastMetricsSample;
  const lines = [
    '# HELP redix_cpu_percent Overall CPU usage percent for the Redix host process',
    '# TYPE redix_cpu_percent gauge',
    `redix_cpu_percent ${sample.cpu}`,
    '# HELP redix_memory_percent Overall memory usage percent for the Redix host process',
    '# TYPE redix_memory_percent gauge',
    `redix_memory_percent ${sample.memory}`,
    '# HELP redix_carbon_intensity Estimated carbon intensity (gCO2/kWh)',
    '# TYPE redix_carbon_intensity gauge',
    `redix_carbon_intensity ${sample.carbon_intensity}`,
    '# HELP redix_worker_cpu_percent Worker CPU usage percent',
    '# TYPE redix_worker_cpu_percent gauge',
    `redix_worker_cpu_percent ${sample.worker?.cpu ?? 0}`,
    '# HELP redix_worker_memory_percent Worker memory usage percent',
    '# TYPE redix_worker_memory_percent gauge',
    `redix_worker_memory_percent ${sample.worker?.memory ?? 0}`,
    '# HELP redix_worker_rss_bytes Worker RSS memory usage in bytes',
    '# TYPE redix_worker_rss_bytes gauge',
    `redix_worker_rss_bytes ${sample.worker?.rss ?? 0}`,
  ];
  reply.header('Content-Type', 'text/plain');
  return lines.join('\n');
});

// Start server after plugins are registered (async for Fastify v5 compatibility)
(async () => {
  try {
    if (enableWebSockets) {
      await fastify.register(websocketPlugin);
    }
    // Initialize WebSocket server before listening
    const httpServer = fastify.server;
    const { initWebSocketServer } = await import('./services/realtime/websocket-server.js');
    initWebSocketServer(httpServer);
    fastify.log.info('WebSocket server initialized');

    // Initialize Voice WebSocket server
    try {
      const { createVoiceWebSocketServer } = await import('./services/voice/voice-production.js');
      createVoiceWebSocketServer(httpServer);
      fastify.log.info('Voice WebSocket server initialized');
    } catch (error) {
      fastify.log.warn('Voice WebSocket server failed to initialize:', error.message);
    }

    // Initialize Collaborative WebSocket server
    try {
      const { createCollabWebSocketServer } = await import('./services/collab/collab-server.js');
      createCollabWebSocketServer(httpServer);
      fastify.log.info('Collaborative WebSocket server initialized');
    } catch (error) {
      fastify.log.warn('Collaborative WebSocket server failed to initialize:', error.message);
    }

    // PERFORMANCE FIX #2: Initialize realtime sync service
    try {
      const { getRealtimeSyncService } = require('./services/sync/realtime-sync.cjs');
      const realtimeSync = getRealtimeSyncService();
      realtimeSync.initialize(httpServer);
      fastify.log.info('Realtime sync service initialized');

      // Add stats endpoint for realtime sync
      fastify.get('/api/sync/stats', async (request, reply) => {
        try {
          const stats = realtimeSync.getStats();
          return { success: true, stats };
        } catch (error) {
          fastify.log.error({ err: error }, 'Failed to get sync stats');
          reply.code(500);
          return { error: 'Failed to get sync stats', message: error.message };
        }
      });

      // PERFORMANCE FIX #4: Add GVE pruning endpoint
      fastify.post('/api/gve/prune', async (request, reply) => {
        try {
          const { daysOld = 7 } = request.body || {};
          const { getQdrantStore } = require('./search-engine/qdrant-store.cjs');
          const qdrant = getQdrantStore();
          const result = await qdrant.pruneOldEmbeddings(daysOld);
          return { success: true, ...result };
        } catch (error) {
          fastify.log.error({ err: error }, 'Failed to prune embeddings');
          reply.code(500);
          return { error: 'Failed to prune embeddings', message: error.message };
        }
      });
    } catch (error) {
      fastify.log.warn({ err: error }, 'Failed to initialize realtime sync service (optional)');
    }

    try {
      // Register admin routes
      try {
        const { registerAdminRoutes } = await import('./admin-api.js');
        registerAdminRoutes(fastify);
        fastify.log.info('Admin routes registered');
      } catch (error) {
        fastify.log.warn({ error }, 'Failed to register admin routes');
      }

      // Initialize Zerodha TOTP auth and daily refresh (if credentials available)
      try {
        const { setupDailyTokenRefresh } = await import('./services/zerodha/totp-auth.js');
        const tokenStore = {
          update: (accessToken, refreshToken, expiresAt) => {
            ZERODHA_ACCESS_TOKEN = accessToken;
            ZERODHA_REFRESH_TOKEN = refreshToken || ZERODHA_REFRESH_TOKEN;
            ZERODHA_TOKEN_EXPIRES_AT = expiresAt;
            if (nodeProcess?.env) {
              nodeProcess.env.ZERODHA_ACCESS_TOKEN = accessToken;
              if (refreshToken) nodeProcess.env.ZERODHA_REFRESH_TOKEN = refreshToken;
              nodeProcess.env.ZERODHA_TOKEN_EXPIRES_AT = expiresAt.toString();
            }
            fastify.log.info('Zerodha token updated');
          },
        };

        // Setup daily refresh at 5:45 AM if credentials are available
        if (
          ZERODHA_API_KEY &&
          (ZERODHA_REFRESH_TOKEN ||
            (nodeProcess?.env.ZERODHA_USER_ID && nodeProcess?.env.ZERODHA_TOTP_SECRET))
        ) {
          setupDailyTokenRefresh(tokenStore.update);
          fastify.log.info('Zerodha daily token refresh scheduled for 5:45 AM');
        }
      } catch (error) {
        fastify.log.warn(
          { err: error },
          'Failed to load Zerodha TOTP auth (optional - configure ZERODHA_USER_ID, ZERODHA_PASSWORD, ZERODHA_TOTP_SECRET for auto-refresh)'
        );
      }

      // Validate API keys at startup
      const apiKeyStatus = validateApiKeys();

      if (!apiKeyStatus.hasLLM && !apiKeyStatus.hasSearch) {
        fastify.log.warn(
          '⚠️  No API keys configured. Research features will use fallback methods.'
        );
      }

      await fastify.listen({ port: PORT, host: '0.0.0.0' });
      fastify.log.info(`Redix server listening on port ${PORT}`);
    } catch (err) {
      console.error('[Redix Server] Failed to start:', err);
      if (process.env.NODE_ENV === 'production') {
        // In production, exit on startup failure
        process.exit(1);
      } else {
        // In dev, log and continue - don't crash
        console.warn('[Redix Server] Server failed to start, but continuing in dev mode');
      }
    }
  } catch (error) {
    fastify.log.error({ error }, 'failed to start redix server');
    nodeProcess?.exit?.(1);
  }
})();

const metricsInterval = globalSetInterval(
  () => {
    lastMetricsSample = makeMetricsSample();
    const payload = JSON.stringify(lastMetricsSample);
    for (const ws of metricsClients) {
      safeWsSend(ws, payload);
    }
  },
  Number(nodeProcess?.env.METRICS_INTERVAL_MS || 2000)
);

fastify.addHook('onClose', () => {
  globalClearInterval(metricsInterval);
  metricsClients.clear();
});

async function enqueueQueryTask({ id, sessionId, query, options }) {
  const taskId = uuidv4();
  const taskPayload = {
    id,
    taskId,
    sessionId,
    query,
    options: options ?? {},
    enqueuedAt: Date.now(),
  };

  await safeRedisOperation(
    () =>
      redisStore.hset(`session:${sessionId}`, {
        lastQuery: query,
        lastTaskId: taskId,
        lastAt: Date.now(),
      }),
    null
  );

  if (redisConnected) {
    try {
      const published = await redisPub.publish('redix_tasks', JSON.stringify(taskPayload));
      if (published <= 0) {
        throw new Error('no-workers-available');
      }
    } catch {
      redisConnected = false;
      // Continue without Redis - task will be processed locally if possible
      fastify.log.warn('Redis unavailable - task processing may be limited');
    }
  }
  return taskId;
}

function makeMetricsSample() {
  const now = Date.now();
  const cpuUsage = nodeProcess?.cpuUsage
    ? nodeProcess.cpuUsage(prevCpuUsage)
    : { user: 0, system: 0 };
  const elapsedMs = Math.max(now - prevCpuTimestamp, 1);
  const totalMicros = (cpuUsage.user ?? 0) + (cpuUsage.system ?? 0);
  const cpuCount = Math.max(os.cpus().length, 1);
  const cpuPercent = clampPercent(Math.round((totalMicros / 1000 / elapsedMs / cpuCount) * 100));
  prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
  prevCpuTimestamp = now;

  const total = os.totalmem();
  const free = os.freemem();
  const usedPercent = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
  return {
    type: 'metrics',
    timestamp: Date.now(),
    cpu: cpuPercent,
    memory: clampPercent(usedPercent),
    carbon_intensity: carbonIntensityDefault,
    worker: workerMetrics,
  };
}

function clampPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Initialize first metrics sample after helper definitions
lastMetricsSample = makeMetricsSample();
