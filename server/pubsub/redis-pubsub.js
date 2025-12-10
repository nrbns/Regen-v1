/**
 * Redis Pub/Sub for Workers
 * Enhanced pub/sub service for worker → Socket.IO communication
 *
 * Workers publish progress/events to Redis channels
 * Socket.IO server subscribes and forwards to clients
 */

const IORedis = require('ioredis');

// Import shared events (fallback if not available)
let EVENTS;
try {
  const eventsModule =
    require('../../packages/shared/events.js') || require('../../packages/shared/events');
  EVENTS = eventsModule?.EVENTS || eventsModule || {};
} catch {
  EVENTS = {};
}

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Publisher client (for workers to publish events)
let pubClient = null;

// Subscriber client (for Socket.IO server to subscribe)
let subClient = null;

/**
 * Initialize Redis clients
 */
function initRedisClients() {
  if (process.env.DISABLE_REDIS === '1') {
    console.log('[RedisPubSub] Redis disabled via DISABLE_REDIS=1');
    return;
  }

  try {
    // Publisher (workers use this)
    pubClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    // Subscriber (Socket.IO server uses this)
    subClient = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    // Suppress errors (Redis is optional)
    pubClient.on('error', () => {});
    subClient.on('error', () => {});

    console.log('[RedisPubSub] Redis clients initialized');
  } catch (error) {
    console.warn('[RedisPubSub] Redis initialization failed (optional):', error.message);
  }
}

/**
 * Publish event from worker to Redis channel
 * Workers call this to notify Socket.IO server
 */
async function publishEvent(channel, event, data) {
  if (!pubClient) {
    initRedisClients();
  }

  if (!pubClient || pubClient.status !== 'ready') {
    // Try to connect if not ready
    try {
      await pubClient?.connect();
    } catch {
      // Silently fail if Redis unavailable
      return false;
    }
  }

  try {
    const message = JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    });

    await pubClient.publish(channel, message);
    return true;
  } catch (error) {
    // Log but don't throw - Redis is optional
    console.warn('[RedisPubSub] Publish failed:', error.message);
    return false;
  }
}

/**
 * Publish job progress
 */
async function publishJobProgress(jobId, userId, progress, status, message) {
  return publishEvent(`job:${jobId}`, EVENTS?.TASK_PROGRESS || 'task:progress:v1', {
    jobId,
    userId,
    progress,
    status,
    message,
  });
}

/**
 * Publish model chunk
 * Publishes to both job-specific channel and general model:chunk channel
 */
async function publishModelChunk(jobId, userId, chunk, index, total) {
  const data = {
    jobId,
    userId,
    chunk,
    index,
    total,
  };

  // Publish to general channel (Socket.IO subscribes here)
  await publishEvent('model:chunk', EVENTS?.MODEL_CHUNK || 'model:chunk:v1', data);

  // Also publish to job-specific channel for targeted subscriptions
  await publishEvent(`job:${jobId}`, EVENTS?.MODEL_CHUNK || 'model:chunk:v1', data);

  return true;
}

/**
 * Publish model complete
 * Publishes to both job-specific channel and general model:complete channel
 */
async function publishModelComplete(jobId, userId, text, tokens, duration) {
  const data = {
    jobId,
    userId,
    text,
    tokens,
    duration,
  };

  // Publish to general channel (Socket.IO subscribes here)
  await publishEvent('model:complete', EVENTS?.MODEL_COMPLETE || 'model:complete:v1', data);

  // Also publish to job-specific channel
  await publishEvent(`job:${jobId}`, EVENTS?.MODEL_COMPLETE || 'model:complete:v1', data);

  return true;
}

/**
 * Publish search result
 */
async function publishSearchResult(jobId, userId, result) {
  return publishEvent(`job:${jobId}`, EVENTS?.SEARCH_RESULT || 'search:result:v1', {
    jobId,
    userId,
    result,
  });
}

/**
 * Subscribe to Redis channel (Socket.IO server uses this)
 */
function subscribeToChannel(channel, handler) {
  if (!subClient) {
    initRedisClients();
  }

  if (!subClient || subClient.status !== 'ready') {
    // Try to connect
    subClient?.connect().catch(() => {});
    return;
  }

  try {
    subClient.subscribe(channel, error => {
      if (error) {
        console.warn('[RedisPubSub] Subscribe error', { channel, error: error.message });
        return;
      }
      console.log('[RedisPubSub] Subscribed to channel', { channel });
    });

    subClient.on('message', (ch, message) => {
      if (ch !== channel) return;

      try {
        const parsed = JSON.parse(message);
        handler(parsed);
      } catch (error) {
        console.error('[RedisPubSub] Parse error', { channel, error: error.message });
      }
    });
  } catch (error) {
    console.warn('[RedisPubSub] Subscribe failed', { channel, error: error.message });
  }
}

// Initialize on module load
initRedisClients();

module.exports = {
  publishEvent,
  publishJobProgress,
  publishModelChunk,
  publishModelComplete,
  publishSearchResult,
  subscribeToChannel,
  getPubClient: () => pubClient,
  getSubClient: () => subClient,
};
