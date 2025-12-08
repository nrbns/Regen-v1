/* eslint-env node */
import { createRequire } from 'node:module';
import { getBullConnection } from '../../config/redis.js';
import crypto from 'node:crypto';

const { Queue } = createRequire(import.meta.url)('bullmq');

const connection = getBullConnection();

/**
 * LLM Job Queue
 * Handles async LLM processing to prevent blocking API responses
 */
export const llmQueue = new Queue('llmQueue', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 200,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    timeout: 60000, // 60s timeout for LLM calls
  },
});

/**
 * Enqueue an LLM job
 * Returns jobId immediately for client to track progress
 */
export async function enqueueLLMJob(payload, options = {}) {
  const { query, context, tabId, sessionId, model = 'phi3:mini', stream = true } = payload;

  if (!query) {
    throw new Error('query-required');
  }

  // Generate stable job ID
  const jobId =
    options.jobId ||
    `llm-${crypto
      .createHash('sha256')
      .update(`${query}-${tabId || ''}-${Date.now()}`)
      .digest('hex')
      .slice(0, 16)}`;

  const job = await llmQueue.add(
    'llm-process',
    {
      query,
      context,
      tabId,
      sessionId,
      model,
      stream,
      ...payload,
    },
    {
      jobId,
      ...options,
    }
  );

  return {
    jobId: job.id,
    status: 'queued',
    estimatedWait: await llmQueue.getWaitingCount(),
  };
}

/**
 * Get job status
 */
export async function getLLMJobStatus(jobId) {
  const job = await llmQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  return {
    id: job.id,
    state: await job.getState(),
    progress: job.progress,
    result: job.returnvalue,
    error: job.failedReason,
    timestamp: job.timestamp,
  };
}






