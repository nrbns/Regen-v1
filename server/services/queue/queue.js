/* eslint-env node */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { getBullConnection } from '../../config/redis.js';

const { Queue } = createRequire(import.meta.url)('bullmq');

const connection = getBullConnection();

export const scrapeQueue = new Queue('scrapeQueue', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 200,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export function buildJobId(url, requestId) {
  if (requestId) return requestId;
  return crypto.createHash('sha256').update(url).digest('hex');
}

export async function enqueueScrape(payload, options = {}) {
  if (!payload?.url) {
    throw new Error('url-required');
  }
  const jobId = buildJobId(payload.url, payload.jobId);
  return scrapeQueue.add(
    'scrape',
    {
      ...payload,
      jobId,
    },
    {
      jobId,
      ...options,
    }
  );
}
