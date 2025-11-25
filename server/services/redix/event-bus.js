/**
 * Redix Event Bus
 * Real-time Pub/Sub for zero-latency communication
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const redis = require('../../config/redis-client');

const log = {
  info: (msg, meta) => console.log(`[EventBus] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[EventBus] ERROR: ${msg}`, meta || ''),
};

/**
 * Publish event to channel
 */
async function publish(channel, event) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      log.error('Redis client not available');
      return false;
    }

    const channelName = channel.startsWith('regen:') ? channel : `regen:${channel}`;
    const payload = JSON.stringify({
      ...event,
      timestamp: Date.now(),
    });

    await client.publish(channelName, payload);
    log.info('Event published', { channel: channelName, type: event.type });
    return true;
  } catch (error) {
    log.error('Failed to publish event', { channel, error: error.message });
    return false;
  }
}

/**
 * Subscribe to channel
 */
async function subscribe(channel, callback) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      log.error('Redis client not available');
      return null;
    }

    const channelName = channel.startsWith('regen:') ? channel : `regen:${channel}`;
    const IORedis = require('ioredis');
    const subscriber = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
    await subscriber.connect();

    await subscriber.subscribe(channelName, message => {
      try {
        const event = JSON.parse(message);
        callback(event);
      } catch (error) {
        log.error('Failed to parse event', { channel, error: error.message });
      }
    });

    log.info('Subscribed to channel', { channel: channelName });

    return {
      unsubscribe: async () => {
        await subscriber.unsubscribe(channelName);
        await subscriber.quit();
        log.info('Unsubscribed from channel', { channel: channelName });
      },
    };
  } catch (error) {
    log.error('Failed to subscribe', { channel, error: error.message });
    return null;
  }
}

/**
 * Publish to specific client
 */
async function publishToClient(clientId, event) {
  return publish(`events:${clientId}`, event);
}

/**
 * Publish Regen status update
 */
async function publishRegenStatus(sessionId, status) {
  return publish(`regen:status:${sessionId}`, {
    type: 'regen_status',
    sessionId,
    status,
  });
}

/**
 * Publish browser command
 */
async function publishCommand(clientId, command) {
  return publish(`commands:${clientId}`, {
    type: 'browser_command',
    clientId,
    command,
  });
}

/**
 * Publish n8n workflow callback
 */
async function publishN8nCallback(workflowId, data) {
  return publish(`n8n:workflow:callbacks`, {
    type: 'n8n_callback',
    workflowId,
    data,
    timestamp: Date.now(),
  });
}

/**
 * Publish automation trigger
 */
async function publishAutomationTrigger(userId, trigger) {
  return publish(`automation:triggers:${userId}`, {
    type: 'automation_trigger',
    userId,
    trigger,
    timestamp: Date.now(),
  });
}

module.exports = {
  publish,
  subscribe,
  publishToClient,
  publishRegenStatus,
  publishCommand,
  publishN8nCallback,
  publishAutomationTrigger,
};
