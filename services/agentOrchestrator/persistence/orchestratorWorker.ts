/**
 * Bull Queue Worker for Plan Execution (Week 3)
 * Distributes orchestration tasks to worker processes
 */

import { ExecutionPlan } from '../planner.js';
import { getTaskExecutor } from '../executor.js';
import { getPlanStore } from './planStore.js';

export interface WorkerJob {
  planId: string;
  plan: ExecutionPlan;
  userId: string;
  approvalToken?: string;
}

export interface WorkerResult {
  planId: string;
  status: 'success' | 'failure' | 'partial' | 'cancelled';
  executionTime: number;
  tasksCompleted: number;
  tasksFailed: number;
  error?: string;
}

/**
 * Mock Bull Queue interface (production: use bull or bullmq)
 * Represents a job queue for distributed task processing
 */
export interface TaskQueue {
  add(jobName: string, data: any, options?: any): Promise<any>;
  process(jobName: string, handler: (job: any) => Promise<any>): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

export class OrchestratorWorker {
  private queue: TaskQueue;
  private executor = getTaskExecutor();
  private planStore = getPlanStore();

  constructor(queue: TaskQueue) {
    this.queue = queue;
  }

  /**
   * Register worker process handler
   */
  registerWorker(): void {
    this.queue.process('execute-plan', async (job: any) => {
      return await this.executePlanJob(job.data);
    });

    // Listen for job events
    this.queue.on('completed', (job: any, result: any) => {
      console.log(`[Worker] Job ${job.id} completed:`, result);
    });

    this.queue.on('failed', (job: any, error: Error) => {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);
    });
  }

  /**
   * Enqueue plan for execution
   */
  async enqueuePlanExecution(plan: ExecutionPlan, userId: string): Promise<string> {
    const job = await this.queue.add('execute-plan', {
      planId: plan.planId,
      plan,
      userId,
    } as WorkerJob);

    console.log(`[Worker] Queued plan ${plan.planId} with job ID ${job.id}`);
    return job.id;
  }

  /**
   * Execute plan (runs in worker process)
   */
  private async executePlanJob(jobData: WorkerJob): Promise<WorkerResult> {
    const { planId, plan, userId: _userId } = jobData;
    const startTime = Date.now();

    try {
      console.log(`[Worker] Executing plan ${planId}...`);

      // Update store: mark as executing
      await this.planStore.update(planId, {
        status: 'executing',
        startedAt: new Date(),
      });

      // Execute plan
      const result = await this.executor.executePlan(plan, {
        onTaskStart: (taskId: string) => {
          console.log(`[Worker] Task ${taskId} started`);
        },
        onTaskComplete: (taskId: string, _data: any) => {
          console.log(`[Worker] Task ${taskId} completed`);
        },
        onTaskFail: (taskId: string, error: Error) => {
          console.error(`[Worker] Task ${taskId} failed:`, error.message);
        },
      });

      // Map result status to PlanStatus
      const planStatus = result.status === 'completed' ? 'completed' : 
                        result.status === 'failed' ? 'failed' :
                        result.status === 'cancelled' ? 'cancelled' : 'completed';

      // Update store with final result
      await this.planStore.update(planId, {
        status: planStatus,
        completedAt: new Date(),
        result,
      });

      const executionTime = Date.now() - startTime;
      const tasksCompleted = result.taskResults.filter(r => r.status === 'success').length;
      const tasksFailed = result.taskResults.filter(r => r.status === 'failure').length;

      // Map ExecutionResult status to WorkerResult status
      const workerStatus: WorkerResult['status'] = 
        result.status === 'completed' ? 'success' :
        result.status === 'failed' ? 'failure' :
        result.status;

      return {
        planId,
        status: workerStatus,
        executionTime,
        tasksCompleted,
        tasksFailed,
      };
    } catch (error: any) {
      console.error(`[Worker] Plan execution failed:`, error);

      // Mark as failed in store
      await this.planStore.update(planId, {
        status: 'failed',
        completedAt: new Date(),
        error: error.message,
      });

      const executionTime = Date.now() - startTime;
      return {
        planId,
        status: 'failure',
        executionTime,
        tasksCompleted: 0,
        tasksFailed: 0,
        error: error.message,
      };
    }
  }
}

export default OrchestratorWorker;
