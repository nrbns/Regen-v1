/* eslint-env node */

import Fastify from 'fastify';
import websocketPlugin from 'fastify-websocket';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { runSearch } from './redix-search.js';

const nodeProcess = globalThis.process;
const globalSetInterval = globalThis.setInterval ? globalThis.setInterval.bind(globalThis) : () => 0;
const globalClearInterval = globalThis.clearInterval ? globalThis.clearInterval.bind(globalThis) : () => {};
const REDIS_URL = nodeProcess?.env.REDIS_URL || 'redis://127.0.0.1:6379';
const PORT = Number(nodeProcess?.env.REDIX_PORT || 4000);

const fastify = Fastify({
  logger: {
    level: nodeProcess?.env.LOG_LEVEL || 'info',
  },
});

fastify.register(websocketPlugin);

const redisPub = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL);
const redisStore = new Redis(REDIS_URL);

const clients = new Map();
const metricsClients = new Set();
let lastMetricsSample = makeMetricsSample();
const carbonIntensityDefault = Number(nodeProcess?.env.CARBON_INTENSITY_DEFAULT || 120);
let workerMetrics = {
  cpu: 0,
  memory: 0,
  rss: 0,
  timestamp: Date.now(),
  source: 'worker',
};
let prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
let prevCpuTimestamp = Date.now();

fastify.get('/health', async () => ({
  ok: true,
  time: Date.now(),
  clients: clients.size,
}));

fastify.get('/ws', { websocket: true }, (connection) => {
  const ws = connection.socket;
  const clientId = uuidv4();
  clients.set(ws, { clientId, createdAt: Date.now() });
  fastify.log.info({ clientId }, 'redix ws connected');

  ws.on('message', async (raw) => {
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
        handleStartQuery(ws, message).catch((error) => {
          fastify.log.error({ error }, 'failed to handle start_query');
          ws.send(JSON.stringify({ id: message.id, type: 'error', payload: { message: error.message } }));
        });
        break;
      case 'cancel':
        handleCancel(message);
        break;
      default:
        ws.send(JSON.stringify({ id: message.id, type: 'error', payload: { message: 'unknown-type' } }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    fastify.log.info({ clientId }, 'redix ws disconnected');
  });
});

fastify.get('/ws/metrics', { websocket: true }, (connection) => {
  const ws = connection.socket;
  metricsClients.add(ws);
  fastify.log.debug('metrics client connected');
  ws.send(JSON.stringify(lastMetricsSample));
  ws.on('close', () => {
    metricsClients.delete(ws);
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
    await redisStore.hset(`session:${sessionId}`, {
      lastQuery: query,
      lastAt: Date.now(),
    });
    const items = await runSearch(query);
    return { items };
  } catch (error) {
    request.log.error({ error }, 'fallback query failed');
    return reply.status(500).send({ error: 'redix-backend-unavailable' });
  }
});

fastify.get('/api/ask', async (request, reply) => {
  const { q, query: queryParam, sessionId: sessionParam } = request.query ?? {};
  const query = typeof q === 'string' && q.trim() ? q.trim() : typeof queryParam === 'string' ? queryParam.trim() : '';
  const sessionId = typeof sessionParam === 'string' && sessionParam.trim() ? sessionParam.trim() : 'anon';

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
  const redisClient = new Redis(REDIS_URL);
  let heartbeatInterval;

  const sendEvent = (event, payload) => {
    if (closed) return;
    reply.raw.write(`event: ${event}\n`);
    reply.raw.write(`data: ${JSON.stringify(payload ?? {})}\n\n`);
    reply.raw.flush?.();
  };

  const cleanup = async (shouldEnd = false) => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeatInterval);
    redisClient.off('message', onMessage);
    try {
      await redisClient.unsubscribe('redix_results');
    } catch {}
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
        cleanup(true).catch((error) => fastify.log.error({ error }, 'failed to cleanup sse client'));
        break;
      case 'error':
        sendEvent('error', message.payload ?? { message: 'unknown-error' });
        cleanup(true).catch((error) => fastify.log.error({ error }, 'failed to cleanup sse client'));
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

  heartbeatInterval = setInterval(() => {
    if (closed) return;
    reply.raw.write(': ping\n\n');
    reply.raw.flush?.();
  }, 15000);

  request.raw.on('close', () => {
    if (!closed) {
      redisPub
        .publish('redix_cancels', JSON.stringify({ taskId, reason: 'client-disconnect' }))
        .catch((error) => fastify.log.warn({ error }, 'failed to publish cancel for sse client'));
      cleanup(false).catch((error) => fastify.log.error({ error }, 'failed to cleanup after disconnect'));
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
  if (!message?.payload?.taskId) {
    return;
  }
  redisPub.publish(
    'redix_cancels',
    JSON.stringify({ taskId: message.payload.taskId, reason: 'client-request' }),
  );
}

redisSub.subscribe('redix_results', 'redix_metrics', (error) => {
  if (error) {
    fastify.log.error({ error }, 'failed to subscribe redis channels');
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

fastify.listen({ port: PORT, host: '0.0.0.0' }).catch((error) => {
  fastify.log.error({ error }, 'failed to start redix server');
  nodeProcess?.exit?.(1);
});

const metricsInterval = globalSetInterval(() => {
  lastMetricsSample = makeMetricsSample();
  const payload = JSON.stringify(lastMetricsSample);
  for (const ws of metricsClients) {
    try {
      ws.send(payload);
    } catch (error) {
      fastify.log.warn({ error }, 'failed to send metrics sample');
    }
  }
}, Number(nodeProcess?.env.METRICS_INTERVAL_MS || 2000));

fastify.addHook('onClose', () => {
  globalClearInterval(metricsInterval);
  metricsClients.clear();
});

function makeMetricsSample() {
  const now = Date.now();
  const cpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage(prevCpuUsage) : { user: 0, system: 0 };
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

