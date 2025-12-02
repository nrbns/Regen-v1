/* eslint-env node */
/**
 * Redis Pub/Sub Helper
 * Lightweight pub/sub for research events
 */

import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const pub = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 5000,
});

const sub = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 5000,
});

// Suppress Redis errors
pub.on('error', () => {});
sub.on('error', () => {});

/**
 * Publish message to Redis channel
 */
export function publish(channel, message) {
  try {
    return pub.publish(channel, JSON.stringify(message));
  } catch {
    // Silently fail if Redis unavailable
    return Promise.resolve();
  }
}

/**
 * Subscribe to Redis channel
 */
export function subscribe(channel, handler) {
  try {
    sub.subscribe(channel, err => {
      if (err && !err.message?.includes('ECONNREFUSED')) {
        console.error('[PubSub] subscribe err', err);
      }
    });

    sub.on('message', (ch, msg) => {
      if (ch !== channel) return;
      try {
        handler(JSON.parse(msg));
      } catch (e) {
        console.error('[PubSub] parse error', e);
      }
    });
  } catch {
    // Silently fail if Redis unavailable
  }
}

export { pub, sub };
