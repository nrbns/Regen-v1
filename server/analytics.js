/**
 * Analytics Service
 * Captures DAU, session metrics, job metrics for investors
 *
 * PR 6: Analytics events & telemetry
 */

const { redisClient } = require('./config/redis.js');
const { publish } = require('./pubsub.js');

const ANALYTICS_PREFIX = 'analytics:';
const DAU_KEY = 'analytics:dau:';
const SESSION_KEY = 'analytics:session:';

/**
 * Track analytics event
 */
async function trackEvent(eventType, data) {
  const timestamp = Date.now();
  const event = {
    type: eventType,
    data,
    timestamp,
  };

  // Publish to Redis for real-time processing
  try {
    await publish('analytics:event', event);
  } catch (error) {
    // Silently fail if Redis unavailable
  }

  // Store in Redis for aggregation (optional - can use Postgres later)
  if (redisClient && redisClient.status === 'ready') {
    try {
      const key = `${ANALYTICS_PREFIX}${eventType}:${timestamp}`;
      await redisClient.setex(key, 86400 * 7, JSON.stringify(event)); // 7 days TTL
    } catch (error) {
      // Silently fail
    }
  }

  return event;
}

/**
 * Track user session start
 */
async function trackSessionStart(userId, sessionId) {
  const session = {
    userId,
    sessionId,
    startedAt: Date.now(),
  };

  // Track DAU (Daily Active Users)
  if (redisClient && redisClient.status === 'ready') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dauKey = `${DAU_KEY}${today}`;
      await redisClient.sadd(dauKey, userId);
      await redisClient.expire(dauKey, 86400 * 2); // 2 days
    } catch (error) {
      // Silently fail
    }
  }

  // Store session
  if (redisClient && redisClient.status === 'ready') {
    try {
      const key = `${SESSION_KEY}${sessionId}`;
      await redisClient.setex(key, 86400, JSON.stringify(session)); // 24 hours
    } catch (error) {
      // Silently fail
    }
  }

  return trackEvent('session:start', session);
}

/**
 * Track user session end
 */
async function trackSessionEnd(sessionId, duration) {
  return trackEvent('session:end', {
    sessionId,
    duration,
    endedAt: Date.now(),
  });
}

/**
 * Track job started
 */
async function trackJobStarted(jobId, userId, jobType) {
  return trackEvent('job:started', {
    jobId,
    userId,
    jobType,
    startedAt: Date.now(),
  });
}

/**
 * Track job completed
 */
async function trackJobCompleted(jobId, userId, jobType, duration, tokens) {
  return trackEvent('job:completed', {
    jobId,
    userId,
    jobType,
    duration,
    tokens,
    completedAt: Date.now(),
  });
}

/**
 * Track job failed
 */
async function trackJobFailed(jobId, userId, jobType, error) {
  return trackEvent('job:failed', {
    jobId,
    userId,
    jobType,
    error: error.message || String(error),
    failedAt: Date.now(),
  });
}

/**
 * Track model latency
 */
async function trackModelLatency(model, latency, tokens) {
  return trackEvent('model:latency', {
    model,
    latency,
    tokens,
    timestamp: Date.now(),
  });
}

/**
 * Get DAU count for today
 */
async function getDAUCount(date = null) {
  if (!redisClient || redisClient.status !== 'ready') {
    return 0;
  }

  try {
    const today = date || new Date().toISOString().split('T')[0];
    const dauKey = `${DAU_KEY}${today}`;
    return await redisClient.scard(dauKey);
  } catch (error) {
    return 0;
  }
}

/**
 * Get metrics summary
 */
async function getMetricsSummary() {
  const today = new Date().toISOString().split('T')[0];

  return {
    dau: await getDAUCount(today),
    timestamp: Date.now(),
  };
}

module.exports = {
  trackEvent,
  trackSessionStart,
  trackSessionEnd,
  trackJobStarted,
  trackJobCompleted,
  trackJobFailed,
  trackModelLatency,
  getDAUCount,
  getMetricsSummary,
};
