/* eslint-env node */

import Redis from 'ioredis';
import os from 'os';
import { runSearch } from './redix-search.js';

const nodeProcess = globalThis.process;
const globalConsole = globalThis.console || { log() {}, warn() {}, error() {} };
const globalSetInterval = globalThis.setInterval ? globalThis.setInterval.bind(globalThis) : () => 0;
const globalClearInterval = globalThis.clearInterval ? globalThis.clearInterval.bind(globalThis) : () => {};
const REDIS_URL = nodeProcess?.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisSub = new Redis(REDIS_URL);
const redisPub = new Redis(REDIS_URL);
let prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
let prevCpuTimestamp = Date.now();
const cpuCount = Math.max(os.cpus().length, 1);

redisSub.subscribe('redix_tasks', (error) => {
  if (error) {
    globalConsole.error('worker failed to subscribe', error);
  } else {
    globalConsole.log('[worker] listening for tasks');
  }
});

redisSub.on('message', async (channel, raw) => {
  if (channel !== 'redix_tasks') return;
  let task;
  try {
    task = JSON.parse(raw.toString());
  } catch (error) {
    globalConsole.error('invalid task payload', error);
    return;
  }

  const { id, taskId, query } = task;
  try {
    await redisPub.publish(
      'redix_results',
      JSON.stringify({
        id,
        type: 'partial_result',
        payload: {
          items: [{ title: `Searching for "${query}"`, url: null }],
          progress: 25,
        },
      }),
    );

    const results = await performSearch(query);

    for (const item of results) {
      await redisPub.publish(
        'redix_results',
        JSON.stringify({
          id,
          type: 'stream',
          payload: {
            item,
          },
        }),
      );
    }

    await redisPub.publish(
      'redix_results',
      JSON.stringify({
        id,
        type: 'final_result',
        payload: {
          items: results,
          progress: 100,
          taskId,
        },
      }),
    );
  } catch (error) {
    await redisPub.publish(
      'redix_results',
      JSON.stringify({
        id,
        type: 'error',
        payload: {
          message: error.message,
        },
      }),
    );
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

const metricsInterval = globalSetInterval(() => {
  const now = Date.now();
  const usage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage(prevCpuUsage) : { user: 0, system: 0 };
  const elapsedMs = Math.max(now - prevCpuTimestamp, 1);
  const totalMicros = (usage.user ?? 0) + (usage.system ?? 0);
  const cpuPercent = clampPercent(Math.round((totalMicros / 1000 / elapsedMs / cpuCount) * 100));
  prevCpuUsage = nodeProcess?.cpuUsage ? nodeProcess.cpuUsage() : { user: 0, system: 0 };
  prevCpuTimestamp = now;

  const memory = nodeProcess?.memoryUsage ? nodeProcess.memoryUsage() : { rss: 0 };
  const rss = memory.rss ?? 0;
  const memoryPercent = clampPercent(Math.round((rss / (os.totalmem() || 1)) * 100));

  redisPub
    .publish(
      'redix_metrics',
      JSON.stringify({
        source: 'worker',
        timestamp: now,
        cpu: cpuPercent,
        memory: memoryPercent,
        rss,
      }),
    )
    .catch((error) => {
      globalConsole.warn('worker failed to publish metrics', error);
    });
}, Number(nodeProcess?.env.WORKER_METRICS_INTERVAL_MS || 2000));

function clampPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

nodeProcess?.on?.('exit', () => {
  globalClearInterval(metricsInterval);
});


