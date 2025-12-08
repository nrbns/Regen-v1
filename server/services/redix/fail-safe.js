/**
 * Redix Fail-Safe System
 * Retry logic, timeouts, deduplication, crash-proof recovery
 */

const redis = require('../../config/redis-client');

const log = {
  info: (msg, meta) => console.log(`[FailSafe] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[FailSafe] ERROR: ${msg}`, meta || ''),
};

const _RETRY_QUEUE = 'fail-safe:retries';
const DEAD_LETTER_QUEUE = 'fail-safe:dead-letters';
const DEDUP_SET = 'fail-safe:dedup';

/**
 * Execute with retry logic
 */
async function executeWithRetry(operation, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;
  const timeout = options.timeout || 30000;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Execute with timeout
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        ),
      ]);

      log.info('Operation succeeded', { attempt, maxRetries });
      return { success: true, result, attempts: attempt };
    } catch (error) {
      lastError = error;
      log.error('Operation failed', { attempt, maxRetries, error: error.message });

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed - add to dead letter queue
  await addToDeadLetterQueue({
    operation: operation.toString(),
    error: lastError.message,
    attempts: maxRetries,
    timestamp: Date.now(),
  });

  return { success: false, error: lastError.message, attempts: maxRetries };
}

/**
 * Deduplicate operation
 */
async function deduplicateOperation(key, operation, ttl = 3600) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      // Fallback: execute anyway
      return await operation();
    }

    const dedupKey = `${DEDUP_SET}:${key}`;

    // Check if already processing
    const exists = await client.exists(dedupKey);
    if (exists) {
      log.info('Operation deduplicated', { key });
      return { deduplicated: true };
    }

    // Mark as processing
    await client.setEx(dedupKey, ttl, '1');

    try {
      // Execute operation
      const result = await operation();

      // Remove from dedup set
      await client.del(dedupKey);

      return { deduplicated: false, result };
    } catch (error) {
      // Remove from dedup set on error
      await client.del(dedupKey);
      throw error;
    }
  } catch (error) {
    log.error('Deduplication failed', { key, error: error.message });
    // Fallback: execute anyway
    return await operation();
  }
}

/**
 * Add to dead letter queue
 */
async function addToDeadLetterQueue(item) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      log.error('Redis not available for dead letter queue');
      return false;
    }

    await client.lPush(DEAD_LETTER_QUEUE, JSON.stringify(item));
    await client.lTrim(DEAD_LETTER_QUEUE, 0, 999); // Keep last 1000 items
    log.info('Added to dead letter queue', { item });
    return true;
  } catch (error) {
    log.error('Failed to add to dead letter queue', { error: error.message });
    return false;
  }
}

/**
 * Get dead letter queue items
 */
async function getDeadLetterQueue(limit = 50) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return [];
    }

    const items = await client.lRange(DEAD_LETTER_QUEUE, 0, limit - 1);
    return items.map(item => JSON.parse(item));
  } catch (error) {
    log.error('Failed to get dead letter queue', { error: error.message });
    return [];
  }
}

/**
 * Recover failed operations
 */
async function recoverFailedOperations(processor) {
  try {
    const items = await getDeadLetterQueue(100);

    for (const item of items) {
      try {
        await processor(item);
        // Remove from queue after successful recovery
        await removeFromDeadLetterQueue(item);
      } catch (error) {
        log.error('Recovery failed', { item, error: error.message });
      }
    }

    return items.length;
  } catch (error) {
    log.error('Failed to recover operations', { error: error.message });
    return 0;
  }
}

/**
 * Remove from dead letter queue
 */
async function removeFromDeadLetterQueue(item) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const itemStr = JSON.stringify(item);
    await client.lRem(DEAD_LETTER_QUEUE, 1, itemStr);
    return true;
  } catch (error) {
    log.error('Failed to remove from dead letter queue', { error: error.message });
    return false;
  }
}

/**
 * Idempotent command execution
 */
async function executeIdempotent(commandId, operation) {
  return deduplicateOperation(`command:${commandId}`, operation, 3600);
}

/**
 * Health check
 */
async function healthCheck() {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return { healthy: false, reason: 'Redis not connected' };
    }

    // Test basic operations
    await client.ping();

    // Check queues
    const dlqLength = await client.lLen(DEAD_LETTER_QUEUE);

    return {
      healthy: true,
      redis: 'connected',
      deadLetterQueue: dlqLength,
    };
  } catch (error) {
    return {
      healthy: false,
      reason: error.message,
    };
  }
}

module.exports = {
  executeWithRetry,
  deduplicateOperation,
  addToDeadLetterQueue,
  getDeadLetterQueue,
  recoverFailedOperations,
  executeIdempotent,
  healthCheck,
};
