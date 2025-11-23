/**
 * Redix Command Queue
 * Ordered execution using Redis Streams
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const redis = require('../../config/redis-client');

const log = {
  info: (msg, meta) => console.log(`[CommandQueue] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[CommandQueue] ERROR: ${msg}`, meta || ''),
};

/**
 * Add command to queue
 */
async function enqueueCommand(tabId, command) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      log.error('Redis client not available');
      return null;
    }

    const streamKey = `stream:browser:commands:${tabId}`;
    const commandData = {
      action: command.action,
      params: command.params || {},
      timestamp: Date.now(),
      id: command.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const messageId = await client.xAdd(streamKey, '*', commandData);
    log.info('Command enqueued', { tabId, streamKey, messageId, action: command.action });

    return messageId;
  } catch (error) {
    log.error('Failed to enqueue command', { tabId, error: error.message });
    return null;
  }
}

/**
 * Read commands from queue
 */
async function readCommands(tabId, count = 10) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return [];
    }

    const streamKey = `stream:browser:commands:${tabId}`;
    const messages = await client.xRead({ key: streamKey, id: '0' }, { COUNT: count, BLOCK: 0 });

    if (!messages || messages.length === 0) {
      return [];
    }

    const commands = messages[0].messages.map(msg => ({
      id: msg.id,
      ...msg.message,
    }));

    log.info('Commands read', { tabId, count: commands.length });
    return commands;
  } catch (error) {
    log.error('Failed to read commands', { tabId, error: error.message });
    return [];
  }
}

/**
 * Acknowledge command (mark as processed)
 */
async function acknowledgeCommand(tabId, messageId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const streamKey = `stream:browser:commands:${tabId}`;
    await client.xAck(streamKey, 'default-group', messageId);
    log.info('Command acknowledged', { tabId, messageId });
    return true;
  } catch (error) {
    log.error('Failed to acknowledge command', { tabId, messageId, error: error.message });
    return false;
  }
}

/**
 * Get queue length
 */
async function getQueueLength(tabId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return 0;
    }

    const streamKey = `stream:browser:commands:${tabId}`;
    const length = await client.xLen(streamKey);
    return length;
  } catch (error) {
    log.error('Failed to get queue length', { tabId, error: error.message });
    return 0;
  }
}

/**
 * Clear queue
 */
async function clearQueue(tabId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const streamKey = `stream:browser:commands:${tabId}`;
    await client.del(streamKey);
    log.info('Queue cleared', { tabId });
    return true;
  } catch (error) {
    log.error('Failed to clear queue', { tabId, error: error.message });
    return false;
  }
}

/**
 * Pause queue (stop processing)
 */
async function pauseQueue(tabId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const pauseKey = `queue:paused:${tabId}`;
    await client.setEx(pauseKey, 3600, '1'); // 1 hour TTL
    log.info('Queue paused', { tabId });
    return true;
  } catch (error) {
    log.error('Failed to pause queue', { tabId, error: error.message });
    return false;
  }
}

/**
 * Resume queue
 */
async function resumeQueue(tabId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const pauseKey = `queue:paused:${tabId}`;
    await client.del(pauseKey);
    log.info('Queue resumed', { tabId });
    return true;
  } catch {
    log.error('Failed to resume queue', { tabId });
    return false;
  }
}

/**
 * Check if queue is paused
 */
async function isQueuePaused(tabId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const pauseKey = `queue:paused:${tabId}`;
    const paused = await client.get(pauseKey);
    return paused === '1';
  } catch {
    return false;
  }
}

module.exports = {
  enqueueCommand,
  readCommands,
  acknowledgeCommand,
  getQueueLength,
  clearQueue,
  pauseQueue,
  resumeQueue,
  isQueuePaused,
};
