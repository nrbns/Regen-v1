/* eslint-env node */

import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { runSearch } from './redix-search.js';
import { enqueueScrape } from './services/queue/queue.js';
import { analyzeWithLLM } from './services/agent/llm.js';
import { createCircuit } from './services/circuit/circuit.js';
import crypto from 'crypto';

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

// Import metrics
/* eslint-disable @typescript-eslint/no-require-imports */
const { getMetrics } = require('./metrics.js');

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
  lazyConnect: false,
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
    title: 'Welcome to OmniBrowser',
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
    const now = Date.now();
    redisConnected = false;

    // Suppress repeated errors - only log once per suppression period
    if (now - lastRedisErrorTime > REDIS_ERROR_SUPPRESSION_MS) {
      if (error?.code === 'ECONNREFUSED') {
        fastify.log.warn(
          { redis: name },
          `[redis:${name}] Connection refused. Redis is optional - the app will continue without it.`
        );
      } else if (error?.code !== 'MaxRetriesPerRequestError') {
        // Don't log MaxRetriesPerRequestError - it's expected when Redis is down
        fastify.log.error(
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

// Redix services
const eventBus = require('./services/redix/event-bus');
const commandQueue = require('./services/redix/command-queue');
const _sessionStore = require('./services/redix/session-store');
const _workflowOrchestrator = require('./services/redix/workflow-orchestrator');
const automationTriggers = require('./services/redix/automation-triggers');
const failSafe = require('./services/redix/fail-safe');

// Real-time WebSocket server
const { initWebSocketServer } = require('./services/realtime/websocket-server');

// Regen API endpoints
const regenController = require('./api/regen-controller');

fastify.post('/api/agent/query', async (request, reply) => {
  return regenController.handleAgentQuery(request, reply);
});

fastify.get('/api/agent/stream', async (request, reply) => {
  return regenController.handleAgentStream(request, reply);
});

// Voice recognition endpoint
const voiceController = require('./api/voice-controller');
fastify.post('/api/voice/recognize', async (request, reply) => {
  return voiceController.handleVoiceRecognize(request, reply);
});

// Regen event endpoint (for n8n callbacks)
fastify.post('/api/regen/event', async (request, reply) => {
  const { type, data, userId, automationId } = request.body;

  // Add to automation triggers stream
  await automationTriggers.addTriggerEvent({
    type,
    userId,
    automationId,
    data,
  });

  // Also broadcast via event bus
  await eventBus.publishN8nCallback(automationId || 'unknown', data);

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

fastify.post('/api/redix/queue/:tabId/ack', async (request, reply) => {
  const { tabId } = request.params;
  const { messageId } = request.body;

  const success = await commandQueue.acknowledgeCommand(tabId, messageId);
  return reply.send({ success });
});

fastify.get('/metrics', async () => lastMetricsSample);

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

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Redix server listening on port ${PORT}`);
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
