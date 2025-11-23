/* eslint-env node */

import Redis from 'ioredis';
import os from 'os';
import { runSearch } from './redix-search.js';

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
const globalConsole = globalThis.console || { log() {}, warn() {}, error() {} };
const globalSetInterval = globalThis.setInterval
  ? globalThis.setInterval.bind(globalThis)
  : () => 0;
const globalClearInterval = globalThis.clearInterval
  ? globalThis.clearInterval.bind(globalThis)
  : () => {};
const REDIS_URL = nodeProcess?.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Redis configuration with error handling
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

const redisSub = new Redis(REDIS_URL, redisConfig);
const redisPub = new Redis(REDIS_URL, redisConfig);

let redisConnected = false;
let lastErrorTime = 0;
const ERROR_SUPPRESSION_MS = 60000; // Suppress errors for 60 seconds

let prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
let prevCpuTimestamp = Date.now();
const cpuCount = Math.max(os.cpus().length, 1);

// Error handling for Redis clients
redisSub.on('connect', () => {
  redisConnected = true;
});

redisSub.on('ready', () => {
  redisConnected = true;
});

redisSub.on('error', error => {
  redisConnected = false;
  const now = Date.now();
  if (now - lastErrorTime > ERROR_SUPPRESSION_MS) {
    if (error?.code === 'ECONNREFUSED') {
      globalConsole.warn(
        '[worker] Redis connection refused. Redis is optional - worker will continue without it.'
      );
    } else {
      globalConsole.error('[worker] Redis subscription error', error?.message || error);
    }
    lastErrorTime = now;
  }
});

redisPub.on('connect', () => {
  redisConnected = true;
});

redisPub.on('ready', () => {
  redisConnected = true;
});

redisPub.on('error', error => {
  redisConnected = false;
  const now = Date.now();
  if (now - lastErrorTime > ERROR_SUPPRESSION_MS) {
    if (error?.code === 'ECONNREFUSED') {
      globalConsole.warn(
        '[worker] Redis connection refused. Redis is optional - worker will continue without it.'
      );
    } else {
      globalConsole.error('[worker] Redis publish error', error?.message || error);
    }
    lastErrorTime = now;
  }
});

redisSub.subscribe('redix_tasks', error => {
  if (error) {
    if (error?.code === 'ECONNREFUSED') {
      globalConsole.warn('[worker] Redis not available - subscription skipped. Redis is optional.');
    } else {
      globalConsole.error('[worker] failed to subscribe', error);
    }
  } else {
    redisConnected = true;
    globalConsole.log('[worker] listening for tasks');
  }
});

redisSub.on('message', async (channel, raw) => {
  if (channel !== 'redix_tasks' || !redisConnected) return;
  let task;
  try {
    task = JSON.parse(raw.toString());
  } catch (error) {
    globalConsole.error('invalid task payload', error);
    return;
  }

  const { id, taskId, query } = task;
  try {
    if (redisConnected) {
      await redisPub
        .publish(
          'redix_results',
          JSON.stringify({
            id,
            type: 'partial_result',
            payload: {
              items: [{ title: `Searching for "${query}"`, url: null }],
              progress: 25,
            },
          })
        )
        .catch(() => {
          // Silently fail if Redis is unavailable
          redisConnected = false;
        });
    }

    const results = await performSearch(query);

    if (redisConnected) {
      for (const item of results) {
        await redisPub
          .publish(
            'redix_results',
            JSON.stringify({
              id,
              type: 'stream',
              payload: {
                item,
              },
            })
          )
          .catch(() => {
            redisConnected = false;
          });
      }

      await redisPub
        .publish(
          'redix_results',
          JSON.stringify({
            id,
            type: 'final_result',
            payload: {
              items: results,
              progress: 100,
              taskId,
            },
          })
        )
        .catch(() => {
          redisConnected = false;
        });
    }
  } catch (error) {
    if (redisConnected) {
      await redisPub
        .publish(
          'redix_results',
          JSON.stringify({
            id,
            type: 'error',
            payload: {
              message: error.message,
            },
          })
        )
        .catch(() => {
          redisConnected = false;
        });
    }
  }
});

async function performSearch(query) {
  try {
    const items = await runSearch(query);
    if (items.length > 0) {
      return items;
    }
  } catch (error) {
    globalConsole.warn('search pipeline failed, using fallback', error);
  }
  return [
    {
      title: `No live results for ${query}`,
      url: null,
      snippet: 'Redix is operating in fallback mode.',
      source: 'fallback',
    },
  ];
}

const metricsInterval = globalSetInterval(
  () => {
    const now = Date.now();
    const usage = nodeProcess?.cpuUsage
      ? nodeProcess.cpuUsage(prevCpuUsage)
      : { user: 0, system: 0 };
    const elapsedMs = Math.max(now - prevCpuTimestamp, 1);
    const totalMicros = (usage.user ?? 0) + (usage.system ?? 0);
    const cpuPercent = clampPercent(Math.round((totalMicros / 1000 / elapsedMs / cpuCount) * 100));
    prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
    prevCpuTimestamp = now;

    const memory = nodeProcess?.memoryUsage ? nodeProcess.memoryUsage() : { rss: 0 };
    const rss = memory.rss ?? 0;
    const memoryPercent = clampPercent(Math.round((rss / (os.totalmem() || 1)) * 100));

    if (redisConnected) {
      redisPub
        .publish(
          'redix_metrics',
          JSON.stringify({
            source: 'worker',
            timestamp: now,
            cpu: cpuPercent,
            memory: memoryPercent,
            rss,
          })
        )
        .catch(error => {
          redisConnected = false;
          // Only log if enough time has passed since last error
          const now = Date.now();
          if (now - lastErrorTime > ERROR_SUPPRESSION_MS) {
            if (error?.code === 'ECONNREFUSED' || error?.code === 'MaxRetriesPerRequestError') {
              // Suppress connection errors - Redis is optional
              return;
            }
            globalConsole.warn('worker failed to publish metrics', error?.message || error);
            lastErrorTime = now;
          }
        });
    }
  },
  Number(nodeProcess?.env.WORKER_METRICS_INTERVAL_MS || 2000)
);

function clampPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

nodeProcess?.on?.('exit', () => {
  globalClearInterval(metricsInterval);
});
