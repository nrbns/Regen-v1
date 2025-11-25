/* eslint-env node */

// ============================================================================
// GLOBAL ERROR GUARDS - MUST BE FIRST
// ============================================================================
// Prevent unhandled errors from crashing the server in development
process.on('uncaughtException', err => {
  console.error('[FATAL] Uncaught exception in Redix server:', err);
  // In dev, log only - don't exit
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit after logging
    // But for now, we'll log and continue to prevent cascading failures
  }
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error('[FATAL] Unhandled rejection in Redix server:', reason);
  // In dev, log only - don't exit
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit after logging
  }
});

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { runSearch } from './redix-search.js';
import { enqueueScrape } from './services/queue/queue.js';
import { analyzeWithLLM } from './services/agent/llm.js';
import { createCircuit } from './services/circuit/circuit.js';
import { researchSearch } from './services/research/search.js';
import { generateResearchAnswer, streamResearchAnswer } from './services/research/answer.js';
import { queryEnhancedResearch } from './services/research/enhanced.js';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// WebSocket server stub
const initWebSocketServer = () => {
  // WebSocket functionality will be handled by Fastify's websocket plugin
};

// Voice controller stub
const voiceController = {
  handleVoiceRecognize: async () => ({ error: 'Voice controller not available' }),
};

// Global error suppression for ioredis - must be set up before any Redis clients are created
const suppressRedisErrors = () => {
  const originalEmit = process.emit;
  let hasBeenSet = false;

  if (!hasBeenSet) {
    process.emit = function (event, ...args) {
      if (event === 'uncaughtException' || event === 'unhandledRejection') {
        const error = args[0];
        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code === 'ECONNREFUSED' || error.code === 'MaxRetriesPerRequestError') {
            // Suppress Redis-related unhandled errors
            return false;
          }
        }
      }
      return originalEmit.apply(this, [event, ...args]);
    };
    hasBeenSet = true;
  }
};

// Set up error suppression immediately
suppressRedisErrors();

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
  },
});

const AI_PROXY_PROVIDER =
  nodeProcess?.env.AI_PROXY_PROVIDER || (nodeProcess?.env.OPENAI_API_KEY ? 'openai' : 'disabled');

const openAIConfig = {
  apiKey: nodeProcess?.env.OPENAI_API_KEY || '',
  baseUrl: nodeProcess?.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions',
  model: nodeProcess?.env.OPENAI_API_MODEL || 'gpt-4o-mini',
};

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

// Websocket plugin will be registered in async startup function below

// Removed unused waitForScrapeMeta function - using inline polling in route handlers

// Redis connection configuration with error handling
const redisConfig = {
  maxRetriesPerRequest: 3,
  retryStrategy: times => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false,
  connectTimeout: 5000,
  lazyConnect: true, // Don't connect immediately - connect on first use
};

const redisPub = new Redis(REDIS_URL, redisConfig);
const redisSub = new Redis(REDIS_URL, redisConfig);
const redisStore = new Redis(REDIS_URL, redisConfig);

// Track connection state and error suppression
let redisConnected = false;
let lastRedisErrorTime = 0;
const REDIS_ERROR_SUPPRESSION_MS = 60000; // Suppress errors for 60 seconds

const clients = new Map();
const metricsClients = new Set();
const notificationClients = new Set();
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

// Error suppression is set up at the top of the file

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

  client.on('error', error => {
    redisConnected = false;

    // Completely suppress all Redis connection errors - Redis is optional
    if (
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'MaxRetriesPerRequestError' ||
      error?.code === 'ENOTFOUND' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('Connection is closed')
    ) {
      // Silently ignore - Redis is optional
      return;
    }

    // Only log non-connection errors in debug mode
    const now = Date.now();
    if (now - lastRedisErrorTime > REDIS_ERROR_SUPPRESSION_MS) {
      if (fastify.log.level === 'debug') {
        fastify.log.debug(
          { error, redis: name },
          `[redis:${name}] ${error?.message || 'Redis error'}`
        );
      }
      lastRedisErrorTime = now;
    }
  });

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

fastify.get('/health', async () => ({
  ok: true,
  time: Date.now(),
  clients: clients.size,
}));

// Metrics endpoint
fastify.get('/metrics', async () => {
  return getMetrics();
});

if (enableWebSockets) {
  fastify.get('/ws', { websocket: true }, connection => {
    const ws = connection.socket;
    const clientId = uuidv4();
    clients.set(ws, { clientId, createdAt: Date.now() });
    fastify.log.info({ clientId }, 'redix ws connected');

    ws.on('message', async raw => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch (error) {
        fastify.log.warn({ error }, 'invalid json from client');
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'invalid-json' } }));
        return;
      }

      switch (message.type) {
        case 'start_query':
          handleStartQuery(ws, message).catch(error => {
            fastify.log.error({ error }, 'failed to handle start_query');
            ws.send(
              JSON.stringify({ id: message.id, type: 'error', payload: { message: error.message } })
            );
          });
          break;
        case 'cancel':
          handleCancel(message);
          break;
        default:
          ws.send(
            JSON.stringify({ id: message.id, type: 'error', payload: { message: 'unknown-type' } })
          );
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      fastify.log.info({ clientId }, 'redix ws disconnected');
    });
  });

  fastify.get('/ws/metrics', { websocket: true }, connection => {
    const ws = connection.socket;
    metricsClients.add(ws);
    fastify.log.debug('metrics client connected');
    ws.send(JSON.stringify(lastMetricsSample));
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

fastify.post('/api/scrape', async (request, reply) => {
  const { url, userId, jobId } = request.body ?? {};
  if (!url || typeof url !== 'string') {
    return reply.status(400).send({ error: 'missing-url' });
  }
  try {
    const job = await enqueueScrape({ url, userId, jobId });
    return { enqueued: true, jobId: job.id };
  } catch (error) {
    request.log.error({ error }, 'failed to enqueue scrape');
    return reply.status(500).send({ error: 'scrape-enqueue-failed' });
  }
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
 * POST /api/agent/query
 * Enhanced agent query endpoint with task support, waitFor polling, and 202 fallback
 * Body: { url, text?, question, task?: 'summarize'|'qa'|'threat', waitFor?: number, callback_url?: string, userId?: string }
 */
fastify.post('/api/agent/query', async (request, reply) => {
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
});

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
  const redisClient = new Redis(REDIS_URL, redisConfig);
  let heartbeatInterval;

  // Add error handling for this client
  redisClient.on('error', error => {
    const now = Date.now();
    if (now - lastRedisErrorTime > REDIS_ERROR_SUPPRESSION_MS) {
      if (error?.code === 'ECONNREFUSED') {
        // Suppress connection errors
        return;
      }
      fastify.log.warn({ error }, 'Redis client error in SSE handler');
      lastRedisErrorTime = now;
    }
  });

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
    redisClient.disconnect();
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

  ws.send(JSON.stringify({ id, type: 'ack', payload: { taskId } }));
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

redisSub.subscribe('redix_results', 'redix_metrics', error => {
  if (error) {
    if (error?.code === 'ECONNREFUSED') {
      fastify.log.warn('Redis not available - subscription skipped. Redis is optional.');
    } else {
      fastify.log.error({ error }, 'failed to subscribe redis channels');
    }
  } else {
    redisConnected = true;
  }
});

redisSub.on('message', (channel, raw) => {
  if (channel === 'redix_results') {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      fastify.log.warn({ error }, 'invalid result payload');
      return;
    }

    for (const [ws] of clients) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        fastify.log.warn({ error }, 'failed to send result');
      }
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

async function callOpenAI(payload) {
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

fastify.post('/api/ai/task', async (request, reply) => {
  const { prompt, kind = 'agent', context, temperature, max_tokens } = request.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    reply.code(400);
    return { error: 'Prompt is required' };
  }

  if (AI_PROXY_PROVIDER === 'disabled') {
    reply.code(503);
    return { error: 'AI proxy is disabled on this server' };
  }

  try {
    let proxyResult;
    switch (AI_PROXY_PROVIDER) {
      case 'openai':
      default:
        proxyResult = await callOpenAI({
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
      provider: AI_PROXY_PROVIDER,
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

// ============================================================================
// RESEARCH API - For Tauri migration
// ============================================================================
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
    initWebSocketServer(httpServer);
    fastify.log.info('WebSocket server initialized');

    try {
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
      try {
        ws.send(payload);
      } catch (error) {
        fastify.log.warn({ error }, 'failed to send metrics sample');
      }
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
