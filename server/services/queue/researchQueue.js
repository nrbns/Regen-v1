/* eslint-env node */
import { createRequire } from 'node:module';
import { getBullConnection } from '../../config/redis.js';
import crypto from 'node:crypto';

const { Queue } = createRequire(import.meta.url)('bullmq');

const connection = getBullConnection();

/**
 * Research Job Queue
 * Handles async research processing with streaming progress
 */
export const researchQueue = new Queue('researchQueue', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 200,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    timeout: 300000, // 5min timeout for research jobs
  },
});

/**
 * Enqueue a research job
 * Returns jobId immediately for client to track progress via WebSocket
 */
export async function enqueueResearchJob(payload, options = {}) {
  const {
    query,
    lang = 'auto',
    options: researchOptions = {},
    clientId,
    sessionId,
    userId,
  } = payload;

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    throw new Error('query-required');
  }

  // Generate stable job ID
  const jobId =
    options.jobId ||
    `research-${crypto
      .createHash('sha256')
      .update(`${query}-${clientId || ''}-${Date.now()}`)
      .digest('hex')
      .slice(0, 16)}`;

  const job = await researchQueue.add(
    'research-task',
    {
      query: query.trim(),
      lang,
      options: researchOptions,
      clientId,
      sessionId,
      userId,
      ...payload,
    },
    {
      jobId,
      priority: options.priority || 1,
      ...options,
    }
  );

  return {
    jobId: job.id,
    status: 'queued',
    estimatedWait: await researchQueue.getWaitingCount(),
  };
}

/**
 * Get research job status
 */
export async function getResearchJobStatus(jobId) {
  const job = await researchQueue.getJob(jobId);
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






