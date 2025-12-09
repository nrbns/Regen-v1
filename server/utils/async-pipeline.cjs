/**
 * PERFORMANCE FIX #5: Async pipeline with concurrency limits
 * Prevents chained calls from blocking each other
 */

const pLimit = require('p-limit');
const Pino = require('pino');

const logger = Pino({ name: 'async-pipeline' });

// Concurrency limits per pipeline type
const LIMITS = {
  research: 3, // Max 3 concurrent research tasks
  trade: 5, // Max 5 concurrent trade fetches
  agent: 2, // Max 2 concurrent agent calls
  default: 3,
};

const limiters = new Map();

function getLimiter(type = 'default') {
  if (!limiters.has(type)) {
    limiters.set(type, pLimit(LIMITS[type] || LIMITS.default));
  }
  return limiters.get(type);
}

/**
 * Execute pipeline tasks in parallel with concurrency limits
 * PERFORMANCE FIX #5: Prevents blocking chained calls
 */
async function executePipeline(tasks, type = 'default') {
  const limiter = getLimiter(type);
  const startTime = Date.now();

  try {
    const results = await Promise.allSettled(
      tasks.map(task => limiter(() => {
        const taskStart = Date.now();
        return Promise.resolve(task()).then(result => {
          const latency = Date.now() - taskStart;
          if (process.env.LOG_PERFORMANCE !== '0') {
            logger.debug({ task: task.name || 'unknown', latency }, 'Pipeline task completed');
          }
          return result;
        });
      }))
    );

    const totalLatency = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (process.env.LOG_PERFORMANCE !== '0') {
      logger.info({
        type,
        totalLatency,
        successful,
        failed,
        total: results.length,
      }, 'Pipeline execution completed');
    }

    return {
      results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
      latency: totalLatency,
      successCount: successful,
      failureCount: failed,
    };
  } catch (error) {
    logger.error({ type, error: error.message }, 'Pipeline execution failed');
    throw error;
  }
}

/**
 * Realtime pipeline for research mode
 * Runs AI + data fetch + semantic search in parallel
 */
async function realtimePipeline(prompt, context = {}) {
  const { runAgent, streamFetch, gveSearch } = context;

  if (!runAgent || !streamFetch || !gveSearch) {
    throw new Error('Pipeline dependencies missing');
  }

  return executePipeline([
    () => runAgent(prompt, 'research'),
    () => streamFetch(`/api/sources?query=${encodeURIComponent(prompt)}`),
    () => gveSearch(prompt),
  ], 'research');
}

module.exports = {
  executePipeline,
  realtimePipeline,
  getLimiter,
};








