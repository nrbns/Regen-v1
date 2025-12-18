/**
 * Worker Job Publisher
 * Helper module for workers to publish progress events to Redis/realtime
 *
 * Usage in worker:
 *   import { publishJobProgress } from './jobPublisher';
 *   await publishJobProgress(redis, jobId, userId, 'running', 'Analyzing query', 25);
 */

import type { Redis } from 'ioredis';
import type { JobProgressEvent, JobCheckpointEvent } from '../packages/shared/events';
import { JobLogManager } from '../server/jobs/logManager';

let sequence = 0;
let logManager: JobLogManager | null = null;

function getNextSequence(): number {
  return ++sequence;
}

/**
 * Initialize log manager (call once at worker startup)
 */
export function initJobPublisher(redis: Redis | null): void {
  logManager = new JobLogManager(redis);
}

/**
 * Get or create log manager instance
 */
function getLogManager(redis: Redis): JobLogManager {
  if (!logManager) {
    logManager = new JobLogManager(redis);
  }
  return logManager;
}

/**
 * Publish job progress event
 */
export async function publishJobProgress(
  redis: Redis,
  jobId: string,
  userId: string,
  state: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled',
  step: string,
  progress: number,
  partial?: string
): Promise<void> {
  const event: JobProgressEvent = {
    jobId,
    userId,
    state,
    step,
    progress: Math.min(100, Math.max(0, progress)),
    partial,
    timestamp: Date.now(),
  };

  // Publish to Redis channel
  const channel = `job:event:${jobId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      ...event,
      sequence: getNextSequence(),
    })
  );

  // Log to job logs
  const logger = getLogManager(redis);
  await logger.info(jobId, `${step} (${progress}%)`);

  console.log(`[JobPublisher] Published progress for job ${jobId}: ${step} (${progress}%)`);
}

/**
 * Publish streaming text chunk
 */
export async function publishJobChunk(
  redis: Redis,
  jobId: string,
  userId: string,
  chunk: string,
  isLast: boolean = false
): Promise<void> {
  const channel = `job:event:${jobId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      jobId,
      userId,
      event: 'job:chunk',
      chunk,
      isLast,
      sequence: getNextSequence(),
      timestamp: Date.now(),
    })
  );

  console.log(`[JobPublisher] Published chunk for job ${jobId} (${chunk.length} bytes)`);
}

/**
 * Publish checkpoint
 */
export async function publishJobCheckpoint(
  redis: Redis,
  jobId: string,
  userId: string,
  checkpoint: Record<string, any>,
  progress: number
): Promise<void> {
  const event: JobCheckpointEvent = {
    jobId,
    userId,
    checkpoint,
    progress,
    timestamp: Date.now(),
  };

  const channel = `job:event:${jobId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      ...event,
      event: 'job:checkpoint',
      sequence: getNextSequence(),
    })
  );

  console.log(`[JobPublisher] Saved checkpoint for job ${jobId}`);
}

/**
 * Publish job completion
 */
export async function publishJobComplete(
  redis: Redis,
  jobId: string,
  userId: string,
  result: any,
  durationMs: number
): Promise<void> {
  const channel = `job:event:${jobId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      jobId,
      userId,
      event: 'job:completed',
      result,
      duration: durationMs,
      sequence: getNextSequence(),
      timestamp: Date.now(),
    })
  );

  // Log completion
  const logger = getLogManager(redis);
  await logger.info(jobId, `Job completed in ${durationMs}ms`);

  console.log(`[JobPublisher] Job ${jobId} completed in ${durationMs}ms`);
}

/**
 * Publish job error
 */
export async function publishJobError(
  redis: Redis,
  jobId: string,
  userId: string,
  error: string,
  recoverable: boolean = true,
  code?: string
): Promise<void> {
  const channel = `job:event:${jobId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      jobId,
      userId,
      event: 'job:failed',
      error,
      code,
      recoverable,
      sequence: getNextSequence(),
      timestamp: Date.now(),
    })
  );

  // Log error
  const logger = getLogManager(redis);
  await logger.error(jobId, error, { code, recoverable });

  console.log(`[JobPublisher] Job ${jobId} error: ${error}`);
}

/**
 * Publish cancellation
 */
export async function publishJobCancelled(
  redis: Redis,
  jobId: string,
  userId: string,
  reason?: string
): Promise<void> {
  const channel = `job:event:${jobId}`;
  await redis.publish(
    channel,
    JSON.stringify({
      jobId,
      userId,
      event: 'job:cancelled',
      reason,
      sequence: getNextSequence(),
      timestamp: Date.now(),
    })
  );

  console.log(`[JobPublisher] Job ${jobId} cancelled`);
}
