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
  enableOfflineQueue: false, // FIX: Disable offline queue to prevent "Stream isn't writeable" errors
  lazyConnect: true,
  connectTimeout: 5000,
  showFriendlyErrorStack: false,
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
 * FIX: Handle Redis connection errors gracefully
 */
export function subscribe(channel, handler) {
  try {
    // Check if Redis is connected before subscribing
    if (sub.status !== 'ready') {
      // Try to connect first (lazy connect)
      sub.connect().catch(() => {
        // Redis unavailable - silently fail (expected in dev without Redis)
        return;
      });
      // Wait a bit for connection, but don't block
      setTimeout(() => {
        if (sub.status === 'ready') {
          _doSubscribe(channel, handler);
        }
      }, 100);
      return; // Exit early, will subscribe when connected
    }

    _doSubscribe(channel, handler);
  } catch (err) {
    // Silently handle Redis errors - Redis is optional
    if (
      !err.message?.includes('ECONNREFUSED') &&
      !err.message?.includes("Stream isn't writeable") &&
      !err.message?.includes('enableOfflineQueue')
    ) {
      console.error('[PubSub] subscribe error', err);
    }
  }
}

function _doSubscribe(channel, handler) {
  try {
    if (sub.status !== 'ready') {
      return; // Not connected, skip
    }

    // Check if Redis connection is actually writeable
    if (!sub.stream || !sub.stream.writable) {
      return; // Stream not writeable, skip
    }

    sub.subscribe(channel, err => {
      if (err) {
        // Only log non-connection errors
        if (
          !err.message?.includes('ECONNREFUSED') &&
          !err.message?.includes("Stream isn't writeable") &&
          !err.message?.includes('enableOfflineQueue') &&
          !err.message?.includes('Connection is closed')
        ) {
          console.error('[PubSub] subscribe err', err);
        }
        // Silently fail for connection errors
        return;
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
    // This is expected when Redis is not running
  }
}

export { pub, sub };
