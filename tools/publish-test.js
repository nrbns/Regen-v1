#!/usr/bin/env node
/**
 * Quick Publisher Test
 * Publishes a test message to Redis research.event channel
 * Usage: node tools/publish-test.js <jobId>
 */

import IORedis from 'ioredis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const jobId = process.argv[2] || `TEST_JOB_${Date.now()}`;

const pub = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 5000,
});

pub.on('error', err => {
  if (err.code !== 'ECONNREFUSED') {
    console.error('[publish-test] Redis error:', err.message);
  }
});

async function test() {
  try {
    // Test connection
    const pong = await pub.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis PING != PONG');
    }
    console.log('[publish-test] ✓ Redis connected to', redisUrl);

    // Publish test message
    const msg = {
      id: `test-${Date.now()}`,
      jobId,
      type: 'research.event',
      eventType: 'llm.chunk',
      seq: 1,
      data: {
        token: `hello-${Date.now()}`,
        index: 1,
      },
      timestamp: Date.now(),
    };

    console.log('[publish-test] Publishing message:', JSON.stringify(msg, null, 2));
    const subscribers = await pub.publish('research.event', JSON.stringify(msg));
    console.log(`[publish-test] ✓ Published to research.event (${subscribers} subscribers)`);
    console.log(`[publish-test] JobId: ${jobId}`);
    console.log(
      '[publish-test] If you have a client subscribed to this jobId, check server/browser logs'
    );

    process.exit(0);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('[publish-test] ✗ Redis not available at', redisUrl);
      console.error('\nTo start Redis:');
      console.error('  docker run -d --name regen-redis -p 6379:6379 redis:7');
      console.error('  or: redis-server');
    } else {
      console.error('[publish-test] ✗ Error:', error.message);
    }
    process.exit(1);
  }
}

test();
