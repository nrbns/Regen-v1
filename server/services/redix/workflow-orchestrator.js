/**
 * Redix Workflow Orchestrator
 * BullMQ + Redis for job queue and workflow execution
 */

const { Queue, Worker } = require('bullmq');

const log = {
  info: (msg, meta) => console.log(`[WorkflowOrchestrator] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[WorkflowOrchestrator] ERROR: ${msg}`, meta || ''),
};

// Workflow queues
const workflowQueues = new Map();

// Active workers registry
const activeWorkers = new Map();

/**
 * Get or create workflow queue
 */
function getWorkflowQueue(name) {
  if (workflowQueues.has(name)) {
    return workflowQueues.get(name);
  }

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const url = new URL(redisUrl);

  const queue = new Queue(name, {
    connection: {
      host: url.hostname || 'localhost',
      port: Number(url.port) || 6379,
      password: url.password || undefined,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  });

  workflowQueues.set(name, queue);
  log.info('Workflow queue created', { name });
  return queue;
}

/**
 * Enqueue workflow job
 */
async function enqueueWorkflow(workflowName, jobData, options = {}) {
  try {
    const queue = getWorkflowQueue(workflowName);
    const job = await queue.add('workflow', jobData, {
      priority: options.priority || 0,
      delay: options.delay || 0,
      jobId:
        options.jobId || `${workflowName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    log.info('Workflow enqueued', { workflowName, jobId: job.id });
    return job.id;
  } catch (error) {
    log.error('Failed to enqueue workflow', { workflowName, error: error.message });
    return null;
  }
}

/**
 * Create workflow worker
 */
function createWorkflowWorker(workflowName, processor) {
  const worker = new Worker(
    workflowName,
    async job => {
      log.info('Processing workflow job', { workflowName, jobId: job.id });
      try {
        const result = await processor(job.data);
        return result;
      } catch (error) {
        log.error('Workflow job failed', { workflowName, jobId: job.id, error: error.message });
        throw error;
      }
    },
    {
      connection: {
        host: url.hostname || 'localhost',
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
      concurrency: 5, // Process 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per second
        duration: 1000,
      },
    }
  );

  worker.on('completed', job => {
    log.info('Workflow job completed', { workflowName, jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    log.error('Workflow job failed', { workflowName, jobId: job.id, error: error.message });
  });

  log.info('Workflow worker created', { workflowName });

  // Register worker
  activeWorkers.set(workflowName, worker);

  // Clean up on worker close
  worker.on('closed', () => {
    activeWorkers.delete(workflowName);
    log.info('Workflow worker closed', { workflowName });
  });

  return worker;
}

/**
 * Get job status
 */
async function getJobStatus(workflowName, jobId) {
  try {
    const queue = getWorkflowQueue(workflowName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      result: job.returnvalue,
      error: job.failedReason,
    };
  } catch (error) {
    log.error('Failed to get job status', { workflowName, jobId, error: error.message });
    return null;
  }
}

/**
 * Cancel job
 */
async function cancelJob(workflowName, jobId) {
  try {
    const queue = getWorkflowQueue(workflowName);
    const job = await queue.getJob(jobId);

    if (job) {
      await job.remove();
      log.info('Job cancelled', { workflowName, jobId });
      return true;
    }

    return false;
  } catch (error) {
    log.error('Failed to cancel job', { workflowName, jobId, error: error.message });
    return false;
  }
}

/**
 * Get queue metrics
 */
async function getQueueMetrics(workflowName) {
  try {
    const queue = getWorkflowQueue(workflowName);

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
  } catch (error) {
    log.error('Failed to get queue metrics', { workflowName, error: error.message });
    return null;
  }
}

/**
 * Get active workers
 */
function getActiveWorkers() {
  return Array.from(activeWorkers.keys());
}

/**
 * Check if any workers are active
 */
function hasActiveWorkers() {
  return activeWorkers.size > 0;
}

module.exports = {
  enqueueWorkflow,
  createWorkflowWorker,
  getJobStatus,
  cancelJob,
  getQueueMetrics,
  getActiveWorkers,
  hasActiveWorkers,
};
