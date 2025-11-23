/**
 * Safe Redis wrapper - makes Redis truly optional
 * All operations return fallback values instead of throwing
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { redisClient } = require('./redis.js');

let redisAvailable = false;

// Check Redis availability
async function checkRedisAvailability() {
  try {
    if (!redisClient) {
      redisAvailable = false;
      return false;
    }
    await redisClient.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}

// Safe Redis operation wrapper
async function safeRedisOp(fn, fallback = null) {
  if (!redisAvailable) {
    const available = await checkRedisAvailability();
    if (!available) {
      return fallback;
    }
  }

  try {
    return await fn(redisClient);
  } catch (err) {
    // Log but don't throw
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Redis Safe] Operation failed:', err?.message || err);
    }
    redisAvailable = false; // Mark as unavailable
    return fallback;
  }
}

// Safe Redis get
async function safeGet(key, fallback = null) {
  return safeRedisOp(async client => {
    const value = await client.get(key);
    return value !== null ? value : fallback;
  }, fallback);
}

// Safe Redis set
async function safeSet(key, value, ttl = null) {
  return safeRedisOp(async client => {
    if (ttl) {
      return await client.setex(key, ttl, value);
    }
    return await client.set(key, value);
  }, false);
}

// Safe Redis del
async function safeDel(key) {
  return safeRedisOp(async client => {
    return await client.del(key);
  }, 0);
}

// Safe Redis exists
async function safeExists(key) {
  return safeRedisOp(async client => {
    return await client.exists(key);
  }, 0);
}

// Safe Redis keys
async function safeKeys(pattern) {
  return safeRedisOp(async client => {
    return await client.keys(pattern);
  }, []);
}

// Safe Redis publish
async function safePublish(channel, message) {
  return safeRedisOp(async client => {
    return await client.publish(channel, JSON.stringify(message));
  }, 0);
}

module.exports = {
  isRedisAvailable: () => redisAvailable,
  checkRedisAvailability,
  safeRedisOp,
  safeGet,
  safeSet,
  safeDel,
  safeExists,
  safeKeys,
  safePublish,
};
