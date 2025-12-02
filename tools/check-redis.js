#!/usr/bin/env node
/**
 * Quick Redis connectivity check
 */

import IORedis from 'ioredis';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log('[Redis Check] Testing connection to:', redisUrl);

const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false,
  connectTimeout: 5000,
});

redis.on('connect', () => {
  console.log('[Redis Check] ✓ Connected');
});

redis.on('error', err => {
  if (err.code === 'ECONNREFUSED') {
    console.error('[Redis Check] ✗ Connection refused');
    console.error('\nTo start Redis:');
    console.error('  docker run -d --name regen-redis -p 6379:6379 redis:7');
    console.error('  or: redis-server');
  } else {
    console.error('[Redis Check] ✗ Error:', err.message);
  }
  process.exit(1);
});

async function check() {
  try {
    const result = await redis.ping();
    console.log('[Redis Check] ✓ PING:', result);

    // Test pub/sub
    const sub = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    await sub.subscribe('research.event');
    console.log('[Redis Check] ✓ Subscribed to research.event channel');

    sub.on('message', (channel, message) => {
      console.log('[Redis Check] ✓ Received message on', channel);
      console.log('[Redis Check] Message:', message.substring(0, 100) + '...');
    });

    // Test publish
    const pub = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      connectTimeout: 5000,
    });

    const testMsg = { test: true, timestamp: Date.now() };
    const subscribers = await pub.publish('research.event', JSON.stringify(testMsg));
    console.log(`[Redis Check] ✓ Published test message (${subscribers} subscribers)`);

    console.log('\n[Redis Check] ✓ All checks passed!');
    console.log('[Redis Check] Redis is ready for research streaming.');

    // Keep sub alive for a moment to see message
    setTimeout(() => {
      sub.disconnect();
      pub.disconnect();
      redis.disconnect();
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('[Redis Check] ✗ Failed:', error.message);
    process.exit(1);
  }
}

check();
