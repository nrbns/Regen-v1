/**
 * Plan Execution Queue (Week 3 - Bull Worker)
 * 
 * Manages distributed plan execution using BullMQ
 * 
 * Features:
 * - Job enqueueing from API routes
 * - Automatic retry with exponential backoff
 * - Job progress tracking
 * - Dead letter queue for failed jobs
 * - Metrics and monitoring
 */

import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection } from '../persistence/redisFactory.js';
import type { ExecutionPlan } from '../planner.js';

export interface PlanExecutionJob {
  planId: string;
  plan: ExecutionPlan;
  userId: string;
  approvedBy?: string;
  timestamp: number;
  timeout?: number;
}

export interface JobResult {
  planId: string;
  success: boolean;
  results: any[];
  error?: string;
  duration: number;
  completedAt: string;
}

let planQueue: Queue<PlanExecutionJob, JobResult> | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Initialize plan execution queue
 */
export function initializePlanQueue(): Queue<PlanExecutionJob, JobResult> {
  if (planQueue) {
    return planQueue;
  }

  const redis = createRedisConnection();
  
  // Create queue with Redis connection
  planQueue = new Queue<PlanExecutionJob, JobResult>('plans:execute', {
    connection: {
      host: redis.options.host || 'localhost',
      port: redis.options.port || 6379,
      password: redis.options.password,
      db: redis.options.db || 0,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  // Set up queue events for monitoring
  queueEvents = new QueueEvents('plans:execute', {
    connection: {
      host: redis.options.host || 'localhost',
      port: redis.options.port || 6379,
      password: redis.options.password,
      db: redis.options.db || 0,
    },
  });

  // Event handlers
  queueEvents.on('waiting', ({ jobId }) => {
    console.log(`[PlanQueue] Job ${jobId} is waiting`);
  });

  queueEvents.on('active', ({ jobId }) => {
    console.log(`[PlanQueue] Job ${jobId} started processing`);
  });

  queueEvents.on('completed', ({ jobId }) => {
    console.log(`[PlanQueue] Job ${jobId} completed successfully`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[PlanQueue] Job ${jobId} failed:`, failedReason);
  });

  queueEvents.on('progress', ({ jobId, data }) => {
    console.log(`[PlanQueue] Job ${jobId} progress:`, data);
  });

  console.log('[PlanQueue] Queue initialized');
  
  return planQueue;
}

/**
 * Get existing queue instance
 */
export function getPlanQueue(): Queue<PlanExecutionJob, JobResult> {
  if (!planQueue) {
    throw new Error('Plan queue not initialized. Call initializePlanQueue() first.');
  }
  return planQueue;
}

/**
 * Enqueue a plan for execution
 */
export async function enqueuePlanExecution(
  planId: string,
  plan: ExecutionPlan,
  userId: string,
  options?: {
    approvedBy?: string;
    timeout?: number;
    priority?: number;
  }
): Promise<string> {
  const queue = getPlanQueue();

  const jobData: PlanExecutionJob = {
    planId,
    plan,
    userId,
    approvedBy: options?.approvedBy,
    timestamp: Date.now(),
    timeout: options?.timeout || 60000,
  };

  const job = await queue.add(
    `execute-${planId}`,
    jobData,
    {
      jobId: `job-${planId}-${Date.now()}`,
      priority: options?.priority || 2,
    }
  );

  console.log(`[PlanQueue] Enqueued plan ${planId} as job ${job.id}`);
  
  return job.id!;
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const queue = getPlanQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    jobId: job.id,
    planId: job.data.planId,
    state,
    progress,
    attemptsMade: job.attemptsMade,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const queue = getPlanQueue();

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const queue = getPlanQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  try {
    await job.remove();
    console.log(`[PlanQueue] Cancelled job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`[PlanQueue] Failed to cancel job ${jobId}:`, error);
    return false;
  }
}

/**
 * Retry a failed job
 */
export async function retryJob(jobId: string): Promise<boolean> {
  const queue = getPlanQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return false;
  }

  try {
    await job.retry();
    console.log(`[PlanQueue] Retrying job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`[PlanQueue] Failed to retry job ${jobId}:`, error);
    return false;
  }
}

/**
 * Clean old jobs
 */
export async function cleanQueue(olderThanMs: number = 24 * 3600 * 1000) {
  const queue = getPlanQueue();
  
  await queue.clean(olderThanMs, 1000, 'completed');
  await queue.clean(olderThanMs * 7, 1000, 'failed'); // Keep failed jobs longer

  console.log(`[PlanQueue] Cleaned jobs older than ${olderThanMs}ms`);
}

/**
 * Close queue and events
 */
export async function closePlanQueue(): Promise<void> {
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }

  if (planQueue) {
    await planQueue.close();
    planQueue = null;
  }

  console.log('[PlanQueue] Queue closed');
}

export default {
  initializePlanQueue,
  getPlanQueue,
  enqueuePlanExecution,
  getJobStatus,
  getQueueMetrics,
  cancelJob,
  retryJob,
  cleanQueue,
  closePlanQueue,
};
