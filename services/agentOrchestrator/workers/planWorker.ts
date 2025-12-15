/**
 * Plan Execution Worker (Week 3 - Bull Worker)
 * 
 * Worker process that executes plans from the queue
 * 
 * Features:
 * - Parallel job processing (configurable concurrency)
 * - Progress updates
 * - Error handling and retries
 * - Result storage in PlanStore
 * - Graceful shutdown
 */

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../persistence/redisFactory.js';
import { getPlanStore } from '../persistence/planStoreFactory.js';
import { getTaskExecutor } from '../executor.js';
import { getSentry } from '../../../server/monitoring/sentry.js';
import { globalPermissionControl } from '../../../services/security/permissionControl.js';
import type { PlanExecutionJob, JobResult } from '../queue/planQueue.js';

let worker: Worker<PlanExecutionJob, JobResult> | null = null;

/**
 * Process a plan execution job
 */
async function processPlanJob(job: Job<PlanExecutionJob, JobResult>): Promise<JobResult> {
  const { planId, plan } = job.data;
  const startTime = Date.now();
  const sentry = getSentry();

  console.log(`[PlanWorker] Processing plan ${planId} (job ${job.id})`);

  // Start Sentry span for distributed tracing
  const span = sentry?.startSpan(`Execute Plan: ${planId}`, {
    planId,
    jobId: job.id,
    agentType: (plan as any).agentType || 'unknown',
    taskCount: plan.tasks.length,
  });

  try {
    // Update plan status to executing
    const planStore = getPlanStore();
    await planStore.update(planId, {
      status: 'executing',
      startedAt: new Date(),
    });

    // Update job progress
    await job.updateProgress(10);

    // Execute the plan
    const executor = getTaskExecutor();
    
    // Execute with progress updates
    const tasks = plan.tasks;
    
    for (let i = 0; i < tasks.length; i++) {
      const progress = 10 + (80 * (i / tasks.length));
      await job.updateProgress(Math.round(progress));

      // Execute task (executor handles retries internally)
      console.log(`[PlanWorker] Executing task ${i + 1}/${tasks.length} for plan ${planId}`);
      
      // Add breadcrumb for each task
      sentry?.addBreadcrumb(
        `Task ${i + 1}/${tasks.length} started`,
        'orchestrator.task',
        { planId, taskIndex: i }
      );
    }

    // Use executor to run full plan
    const executionResults = await executor.executePlan(plan);

    // Update job progress to 90%
    await job.updateProgress(90);

    // Update plan status to completed
    await planStore.update(planId, {
      status: 'completed',
      completedAt: new Date(),
    });

    // Final progress
    await job.updateProgress(100);

    const duration = Date.now() - startTime;

    console.log(`[PlanWorker] Completed plan ${planId} in ${duration}ms`);

    // Track success metrics in Sentry
    if (sentry && executionResults) {
      sentry.captureExecutionMetrics(planId, executionResults as any, {
        userId: job.data.userId,
        agentType: (plan as any).agentType || 'unknown',
      });
    }

    span?.setTag('status', 'success');
    span?.setData('duration', duration);
    span?.end();

    // Decrement execution count (Week 5 quota tracking)
    await globalPermissionControl.decrementExecution(job.data.userId);

    return {
      planId,
      success: true,
      results: [executionResults] as any[],
      duration,
      completedAt: new Date().toISOString(),
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[PlanWorker] Failed to execute plan ${planId}:`, errorMessage);

    // Capture error in Sentry
    if (sentry && error instanceof Error) {
      sentry.captureExecutionError(planId, error, {
        userId: job.data.userId,
        agentType: (plan as any).agentType || 'unknown',
        taskCount: plan.tasks.length,
      });

      // Also capture queue-specific error
      sentry.captureQueueError(job.id!, error, {
        planId,
        attemptNumber: job.attemptsMade,
        queueName: 'plans:execute',
      });
    }

    span?.setTag('status', 'error');
    span?.setData('error', errorMessage);
    span?.end();

    // Decrement execution count even on failure (Week 5 quota tracking)
    await globalPermissionControl.decrementExecution(job.data.userId);

    // Update plan status to failed
    try {
      const planStore = getPlanStore();
      await planStore.update(planId, {
        status: 'failed',
        completedAt: new Date(),
      });
    } catch (updateError) {
      console.error(`[PlanWorker] Failed to update plan status:`, updateError);
    }

    return {
      planId,
      success: false,
      results: [],
      error: errorMessage,
      duration,
      completedAt: new Date().toISOString(),
    };
  }
}

/**
 * Create and start plan execution worker
 */
export function createPlanWorker(concurrency: number = 5): Worker<PlanExecutionJob, JobResult> {
  if (worker) {
    console.log('[PlanWorker] Worker already running');
    return worker;
  }

  const redis = createRedisConnection();

  worker = new Worker<PlanExecutionJob, JobResult>(
    'plans:execute',
    processPlanJob,
    {
      connection: {
        host: redis.options.host || 'localhost',
        port: redis.options.port || 6379,
        password: redis.options.password,
        db: redis.options.db || 0,
      },
      concurrency,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Exponential backoff: 2s, 4s, 8s
          return Math.min(2000 * Math.pow(2, attemptsMade - 1), 30000);
        },
      },
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    console.log(`[PlanWorker] Job ${job.id} completed:`, {
      planId: result.planId,
      duration: result.duration,
      success: result.success,
    });
  });

  worker.on('failed', (job, error) => {
    console.error(`[PlanWorker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[PlanWorker] Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[PlanWorker] Job ${jobId} stalled, will be retried`);
  });

  console.log(`[PlanWorker] Worker started with concurrency ${concurrency}`);

  return worker;
}

/**
 * Get worker instance
 */
export function getPlanWorker(): Worker<PlanExecutionJob, JobResult> | null {
  return worker;
}

/**
 * Stop worker gracefully
 */
export async function stopPlanWorker(): Promise<void> {
  if (worker) {
    console.log('[PlanWorker] Stopping worker...');
    await worker.close();
    worker = null;
    console.log('[PlanWorker] Worker stopped');
  }
}

/**
 * Get worker status
 */
export function getWorkerStatus() {
  if (!worker) {
    return {
      running: false,
      concurrency: 0,
    };
  }

  return {
    running: !worker.closing,
    concurrency: worker.opts.concurrency || 1,
  };
}

export default {
  createPlanWorker,
  getPlanWorker,
  stopPlanWorker,
  getWorkerStatus,
};
