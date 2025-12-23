/**
 * Job Authority - Enforced Everywhere
 *
 * ALL AI operations MUST go through jobs.
 * This is non-negotiable.
 *
 * Without Job Authority:
 * - No resumability
 * - No determinism
 * - No audit trail
 * - No trust
 *
 * Usage:
 *
 * ```ts
 * import { jobAuthority } from '@/core/jobAuthority';
 *
 * // Create job for AI operation
 * const job = await jobAuthority.createJob({
 *   type: 'research',
 *   query: 'User query here'
 * });
 *
 * // Execute with job context
 * await jobAuthority.executeWithJob(job.id, async (ctx) => {
 *   // All AI operations logged automatically
 *   const result = await aiEngine.research(ctx.query);
 *   return result;
 * });
 * ```
 */

import { eventLedger } from '../eventLedger';
import type { EventLedgerEntry as _EventLedgerEntry } from '../eventLedger/types';

export interface JobContext {
  jobId: string;
  userId: string;
  type: 'research' | 'trade' | 'analysis' | 'agent' | 'skill';
  query?: string;
  data?: Record<string, any>;
}

export interface JobCheckpoint {
  jobId: string;
  state: 'running' | 'paused' | 'failed';
  progress: number;
  step: string;
  data: Record<string, any>;
  timestamp: number;
}

class JobAuthority {
  private activeJobs = new Map<string, JobContext>();
  private checkpoints = new Map<string, JobCheckpoint>();

  /**
   * Create a job - mandatory for all AI operations
   */
  async createJob(params: {
    userId: string;
    type: JobContext['type'];
    query?: string;
    data?: Record<string, any>;
  }): Promise<JobContext> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: JobContext = {
      jobId,
      userId: params.userId,
      type: params.type,
      query: params.query,
      data: params.data || {},
    };

    this.activeJobs.set(jobId, job);

    // Log job creation
    await eventLedger.log({
      type: 'job:create',
      jobId,
      userId: params.userId,
      data: {
        type: params.type,
        query: params.query,
        ...params.data,
      },
      reasoning: `Job created for ${params.type} operation`,
    });

    return job;
  }

  /**
   * Execute function with job context - ensures all operations are logged
   */
  async executeWithJob<T>(jobId: string, fn: (ctx: JobContext) => Promise<T>): Promise<T> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      // Log start
      await eventLedger.log({
        type: 'ai:action:start',
        jobId,
        userId: job.userId,
        data: {
          action: 'execute',
          type: job.type,
          query: job.query,
        },
        reasoning: `Starting execution for job ${jobId}`,
      });

      // Execute function
      const result = await fn(job);

      // Log completion
      await eventLedger.log({
        type: 'ai:action:complete',
        jobId,
        userId: job.userId,
        data: {
          action: 'execute',
          result: result,
        },
        reasoning: `Execution completed for job ${jobId}`,
      });

      return result;
    } catch (error) {
      // Log error
      await eventLedger.log({
        type: 'ai:action:error',
        jobId,
        userId: job.userId,
        data: {
          action: 'execute',
          error: error instanceof Error ? error.message : String(error),
        },
        reasoning: `Execution failed for job ${jobId}`,
      });

      throw error;
    }
  }

  /**
   * Create checkpoint - for resumability
   */
  async checkpoint(params: {
    jobId: string;
    progress: number;
    step: string;
    data: Record<string, any>;
  }): Promise<void> {
    const job = this.activeJobs.get(params.jobId);
    if (!job) {
      throw new Error(`Job ${params.jobId} not found`);
    }

    const checkpoint: JobCheckpoint = {
      jobId: params.jobId,
      state: 'running',
      progress: params.progress,
      step: params.step,
      data: params.data,
      timestamp: Date.now(),
    };

    this.checkpoints.set(params.jobId, checkpoint);

    // Log checkpoint
    await eventLedger.log({
      type: 'job:checkpoint',
      jobId: params.jobId,
      userId: job.userId,
      data: {
        progress: params.progress,
        step: params.step,
      },
      stateSnapshot: params.data,
      reasoning: `Checkpoint created at ${params.progress}% - ${params.step}`,
    });

    // Persist checkpoint to localStorage for crash recovery
    if (typeof window !== 'undefined') {
      try {
        const checkpoints = JSON.parse(localStorage.getItem('regen:job:checkpoints') || '{}');
        checkpoints[params.jobId] = checkpoint;
        localStorage.setItem('regen:job:checkpoints', JSON.stringify(checkpoints));
      } catch (error) {
        console.error('[JobAuthority] Failed to persist checkpoint:', error);
      }
    }
  }

  /**
   * Resume job from checkpoint
   */
  async resume(jobId: string): Promise<JobCheckpoint | null> {
    // Try in-memory first
    let checkpoint = this.checkpoints.get(jobId);

    // Try localStorage (for crash recovery)
    if (!checkpoint && typeof window !== 'undefined') {
      try {
        const checkpoints = JSON.parse(localStorage.getItem('regen:job:checkpoints') || '{}');
        checkpoint = checkpoints[jobId] || null;
        if (checkpoint) {
          this.checkpoints.set(jobId, checkpoint);
        }
      } catch (error) {
        console.error('[JobAuthority] Failed to load checkpoint:', error);
      }
    }

    if (checkpoint) {
      const job = this.activeJobs.get(jobId);
      if (job) {
        await eventLedger.log({
          type: 'job:resume',
          jobId,
          userId: job.userId,
          data: {
            progress: checkpoint.progress,
            step: checkpoint.step,
          },
          stateSnapshot: checkpoint.data,
          reasoning: `Job resumed from checkpoint at ${checkpoint.progress}%`,
        });
      }
    }

    return checkpoint || null;
  }

  /**
   * Get active jobs
   */
  getActiveJobs(): JobContext[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): JobContext | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Complete job
   */
  async complete(jobId: string, result?: any): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Log completion
    await eventLedger.log({
      type: 'job:complete',
      jobId,
      userId: job.userId,
      data: {
        result,
      },
      reasoning: `Job ${jobId} completed`,
    });

    // Cleanup
    this.activeJobs.delete(jobId);
    this.checkpoints.delete(jobId);

    // Cleanup localStorage
    if (typeof window !== 'undefined') {
      try {
        const checkpoints = JSON.parse(localStorage.getItem('regen:job:checkpoints') || '{}');
        delete checkpoints[jobId];
        localStorage.setItem('regen:job:checkpoints', JSON.stringify(checkpoints));
      } catch (error) {
        console.error('[JobAuthority] Failed to cleanup checkpoint:', error);
      }
    }
  }

  /**
   * Check for crashed jobs (no activity for > 5 minutes)
   */
  async checkCrashedJobs(): Promise<string[]> {
    const crashed: string[] = [];
    const now = Date.now();
    const CRASH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    for (const [jobId, checkpoint] of this.checkpoints.entries()) {
      if (now - checkpoint.timestamp > CRASH_THRESHOLD) {
        crashed.push(jobId);
      }
    }

    return crashed;
  }
}

export const jobAuthority = new JobAuthority();

// Auto-check for crashed jobs on startup
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    jobAuthority.checkCrashedJobs().then(crashed => {
      if (crashed.length > 0) {
        console.warn(`[JobAuthority] Found ${crashed.length} crashed jobs:`, crashed);
        // Emit event for UI to show recovery options
        window.dispatchEvent(
          new CustomEvent('jobAuthority:crashed', { detail: { jobIds: crashed } })
        );
      }
    });
  });
}
