/**
 * Job Persistence Service
 * Stores job state for resume capability on reconnect
 *
 * PR 5: Job persistence and resume
 */

const { redisClient } = require('../config/redis.js');

const JOB_PREFIX = 'job:state:';
const JOB_TTL = 86400; // 24 hours

/**
 * Persist job state
 */
async function persistJobState(jobId, userId, state) {
  if (!redisClient || redisClient.status !== 'ready') {
    // Silently fail if Redis unavailable
    return false;
  }

  try {
    const key = `${JOB_PREFIX}${jobId}`;
    const data = {
      jobId,
      userId,
      ...state,
      updatedAt: Date.now(),
    };

    await redisClient.setex(key, JOB_TTL, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('[JobPersistence] Failed to persist state', { jobId, error: error.message });
    return false;
  }
}

/**
 * Get persisted job state
 */
async function getJobState(jobId) {
  if (!redisClient || redisClient.status !== 'ready') {
    return null;
  }

  try {
    const key = `${JOB_PREFIX}${jobId}`;
    const data = await redisClient.get(key);

    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.warn('[JobPersistence] Failed to get state', { jobId, error: error.message });
    return null;
  }
}

/**
 * Update job progress
 */
async function updateJobProgress(jobId, userId, progress, status, lastSequence = null) {
  return persistJobState(jobId, userId, {
    progress,
    status,
    lastSequence,
  });
}

/**
 * Mark job as complete
 */
async function markJobComplete(jobId, userId, result) {
  return persistJobState(jobId, userId, {
    status: 'completed',
    progress: 100,
    result,
    completedAt: Date.now(),
  });
}

/**
 * Mark job as failed
 */
async function markJobFailed(jobId, userId, error) {
  return persistJobState(jobId, userId, {
    status: 'failed',
    error: error.message || String(error),
    failedAt: Date.now(),
  });
}

/**
 * Delete job state (cleanup)
 */
async function deleteJobState(jobId) {
  if (!redisClient || redisClient.status !== 'ready') {
    return false;
  }

  try {
    const key = `${JOB_PREFIX}${jobId}`;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn('[JobPersistence] Failed to delete state', { jobId, error: error.message });
    return false;
  }
}

module.exports = {
  persistJobState,
  getJobState,
  updateJobProgress,
  markJobComplete,
  markJobFailed,
  deleteJobState,
};
