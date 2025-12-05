/**
 * Session Cursor API
 * Production-grade Redis-based session cursor management
 * Replaces file-based .cursor with distributed Redis state
 */

const express = require('express');
const { getRedisClient } = require('../../config/redis-client');
const Pino = require('pino');

const logger = Pino({ name: 'session-cursor-api' });
const router = express.Router();

// Redis key patterns
const SESSION_CURSOR_KEY = (sessionId) => `session:${sessionId}:cursor`;
const SESSION_LOCK_KEY = (sessionId) => `session:${sessionId}:lock`;
const SESSION_METADATA_KEY = (sessionId) => `session:${sessionId}:meta`;

// Lock timeout (60 seconds)
const LOCK_TTL = 60;

/**
 * Acquire session lock (prevents multi-tab conflicts)
 */
async function acquireLock(sessionId, workerId) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis not available');
  }

  const lockKey = SESSION_LOCK_KEY(sessionId);
  const acquired = await redis.set(lockKey, workerId, 'NX', 'EX', LOCK_TTL);
  
  if (!acquired) {
    const currentOwner = await redis.get(lockKey);
    throw new Error(`Session locked by worker: ${currentOwner}`);
  }

  return true;
}

/**
 * Release session lock
 */
async function releaseLock(sessionId, workerId) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  const lockKey = SESSION_LOCK_KEY(sessionId);
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  
  await redis.eval(script, 1, lockKey, workerId);
}

/**
 * Get session cursor (read-only, no lock needed)
 */
router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const redis = getRedisClient();

  if (!redis) {
    return res.status(503).json({
      error: 'Redis not available',
      message: 'Session cursor service unavailable',
    });
  }

  try {
    const cursorKey = SESSION_CURSOR_KEY(sessionId);
    const cursorData = await redis.get(cursorKey);

    if (!cursorData) {
      return res.json({
        sessionId,
        cursor: null,
        exists: false,
      });
    }

    const cursor = JSON.parse(cursorData);
    res.json({
      sessionId,
      cursor,
      exists: true,
      lastUpdated: cursor.timestamp || Date.now(),
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Error getting cursor');
    res.status(500).json({
      error: 'Failed to get cursor',
      message: error.message,
    });
  }
});

/**
 * Update session cursor (requires lock)
 */
router.put('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { cursor, workerId } = req.body;

  if (!cursor) {
    return res.status(400).json({
      error: 'Cursor data required',
    });
  }

  if (!workerId) {
    return res.status(400).json({
      error: 'Worker ID required for cursor updates',
    });
  }

  const redis = getRedisClient();
  if (!redis) {
    return res.status(503).json({
      error: 'Redis not available',
    });
  }

  try {
    // Acquire lock
    await acquireLock(sessionId, workerId);

    // Update cursor
    const cursorKey = SESSION_CURSOR_KEY(sessionId);
    const cursorData = {
      ...cursor,
      timestamp: Date.now(),
      workerId,
    };

    await redis.set(cursorKey, JSON.stringify(cursorData), 'EX', 3600); // 1 hour TTL

    // Update metadata
    const metaKey = SESSION_METADATA_KEY(sessionId);
    await redis.hset(metaKey, {
      lastUpdate: Date.now(),
      workerId,
      updateCount: await redis.hincrby(metaKey, 'updateCount', 1),
    });
    await redis.expire(metaKey, 3600);

    // Release lock
    await releaseLock(sessionId, workerId);

    res.json({
      success: true,
      sessionId,
      cursor: cursorData,
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Error updating cursor');
    
    // Try to release lock if we acquired it
    try {
      await releaseLock(sessionId, workerId);
    } catch (e) {
      // Ignore
    }

    if (error.message.includes('locked')) {
      return res.status(409).json({
        error: 'Session locked',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to update cursor',
      message: error.message,
    });
  }
});

/**
 * Delete session cursor
 */
router.delete('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const redis = getRedisClient();

  if (!redis) {
    return res.status(503).json({
      error: 'Redis not available',
    });
  }

  try {
    const cursorKey = SESSION_CURSOR_KEY(sessionId);
    const metaKey = SESSION_METADATA_KEY(sessionId);
    const lockKey = SESSION_LOCK_KEY(sessionId);

    await Promise.all([
      redis.del(cursorKey),
      redis.del(metaKey),
      redis.del(lockKey),
    ]);

    res.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Error deleting cursor');
    res.status(500).json({
      error: 'Failed to delete cursor',
      message: error.message,
    });
  }
});

/**
 * Get session metadata
 */
router.get('/:sessionId/meta', async (req, res) => {
  const { sessionId } = req.params;
  const redis = getRedisClient();

  if (!redis) {
    return res.status(503).json({
      error: 'Redis not available',
    });
  }

  try {
    const metaKey = SESSION_METADATA_KEY(sessionId);
    const metadata = await redis.hgetall(metaKey);

    if (!metadata || Object.keys(metadata).length === 0) {
      return res.json({
        sessionId,
        exists: false,
      });
    }

    res.json({
      sessionId,
      exists: true,
      ...metadata,
    });
  } catch (error) {
    logger.error({ sessionId, error: error.message }, 'Error getting metadata');
    res.status(500).json({
      error: 'Failed to get metadata',
      message: error.message,
    });
  }
});

module.exports = router;
