#!/usr/bin/env node
/* eslint-env node */
// Load environment variables first
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

import { createRequire } from 'node:module';
import { getBullConnection } from '../../config/redis.js';
import { handleScrapeJob } from '../scraper/scraperJobHandler.js';

const { Worker } = createRequire(import.meta.url)('bullmq');

const connection = getBullConnection();
const concurrency = Number(process.env.SCRAPER_CONCURRENCY || 5);

const worker = new Worker(
  'scrapeQueue',
  async job => {
    if (!job?.data?.url) {
      throw new Error('missing-url');
    }
    return handleScrapeJob(job.data);
  },
  {
    connection,
    concurrency,
  }
);

worker.on('completed', job => {
  console.info('[worker] completed', job.id);
});

worker.on('failed', (job, err) => {
  console.error('[worker] failed', job?.id, err);
});

worker.on('error', err => {
  // Suppress Redis connection errors - they're already handled
  if (err && typeof err === 'object' && 'code' in err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'MaxRetriesPerRequestError') {
      return; // Suppress these errors
    }
  }
  console.error('[worker] error', err);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});
