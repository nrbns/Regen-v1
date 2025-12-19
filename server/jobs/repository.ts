/**
 * Job Repository
 * Business logic layer on top of store
 * Handles domain operations (create research job, trade job, etc)
 *
 * Separation of concerns:
 * - Store: Data access
 * - Repository: Business logic
 * - Workers: Execution
 */

import { IJobStore, jobStore } from './store';
import type { JobRecord } from './stateMachine';
import type { JobState } from '../../packages/shared/events';

export interface CreateResearchJobRequest {
  userId: string;
  query: string;
  sources?: string[];
}

export interface CreateTradeJobRequest {
  userId: string;
  symbol: string;
  action: 'analyze' | 'monitor' | 'backtest';
}

export interface CreateAnalysisJobRequest {
  userId: string;
  content: string;
  analysisType: 'summary' | 'sentiment' | 'extraction';
}

/**
 * Job Repository
 * All job operations go through here
 */
export class JobRepository {
  constructor(private store: IJobStore) {}

  // === Creation ===

  async createResearchJob(request: CreateResearchJobRequest): Promise<string> {
    return this.store.create({
      userId: request.userId,
      type: 'research',
      query: request.query,
      state: 'created',
      progress: 0,
      step: 'Initializing',
    });
  }

  async createTradeJob(request: CreateTradeJobRequest): Promise<string> {
    return this.store.create({
      userId: request.userId,
      type: 'trade',
      query: `${request.action} ${request.symbol}`,
      state: 'created',
      progress: 0,
      step: 'Connecting to market data',
    });
  }

  async createAnalysisJob(request: CreateAnalysisJobRequest): Promise<string> {
    return this.store.create({
      userId: request.userId,
      type: 'analysis',
      query: request.analysisType,
      state: 'created',
      progress: 0,
      step: 'Preparing analysis',
    });
  }

  // === Retrieval ===

  /**
   * Get job with all context
   */
  async getJob(jobId: string): Promise<JobRecord | null> {
    return this.store.get(jobId);
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(userId: string, limit = 50): Promise<JobRecord[]> {
    return this.store.list({
      userId,
      limit,
      offset: 0,
    });
  }

  /**
   * Get user's active jobs (for UI dashboard)
   */
  async getUserActiveJobs(userId: string): Promise<JobRecord[]> {
    return this.store.list({
      userId,
      state: 'running',
    });
  }

  /**
   * Get user's recent completed jobs
   */
  async getUserCompletedJobs(userId: string, limit = 20): Promise<JobRecord[]> {
    return this.store.list({
      userId,
      state: 'completed',
      limit,
    });
  }

  /**
   * Get user's failed jobs (for error recovery UI)
   */
  async getUserFailedJobs(userId: string): Promise<JobRecord[]> {
    return this.store.list({
      userId,
      state: 'failed',
    });
  }

  // === Progress Updates ===

  /**
   * Worker calls this to update progress
   */
  async updateProgress(jobId: string, progress: number, step: string): Promise<void> {
    await this.store.setProgress(jobId, progress, step);
  }

  /**
   * Worker calls this on error
   */
  async markFailed(jobId: string, error: string): Promise<void> {
    await this.store.setError(jobId, error);
  }

  /**
   * Worker calls this before pausing
   */
  async checkpoint(jobId: string, checkpointData: Record<string, any>): Promise<void> {
    await this.store.checkpoint(jobId, checkpointData);
    await this.store.setState(jobId, 'paused');
  }

  /**
   * Mark job complete with result
   */
  async complete(jobId: string, result: Record<string, any>): Promise<void> {
    await this.store.setResult(jobId, result);
  }

  /**
   * Worker heartbeat (keeps job alive for supervisor)
   */
  async heartbeat(jobId: string): Promise<void> {
    await this.store.heartbeat(jobId);
  }

  /**
   * Direct state transition wrapper (used by recovery logic)
   */
  async setState(jobId: string, state: JobState): Promise<void> {
    await this.store.setState(jobId, state);
  }

  // === Control ===

  /**
   * User cancels job
   */
  async cancel(jobId: string): Promise<void> {
    const job = await this.store.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Can't cancel completed/failed jobs
    if (['completed', 'failed', 'cancelled'].includes(job.state)) {
      throw new Error(`Cannot cancel job in state: ${job.state}`);
    }

    await this.store.cancel(jobId);
  }

  /**
   * User pauses job (for later resume)
   */
  async pause(jobId: string): Promise<void> {
    const job = await this.store.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.state !== 'running') {
      throw new Error(`Can only pause running jobs, current: ${job.state}`);
    }

    await this.store.setState(jobId, 'paused');
  }

  /**
   * User resumes paused job
   */
  async resume(jobId: string): Promise<JobRecord> {
    const job = await this.store.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.state !== 'paused') {
      throw new Error(`Can only resume paused jobs, current: ${job.state}`);
    }

    if (!job.checkpointData) {
      throw new Error('No checkpoint data available for resume');
    }

    // Reset to created state so worker picks it up again
    await this.store.setState(jobId, 'created');

    return this.store.get(jobId) as Promise<JobRecord>;
  }

  // === Recovery & Monitoring ===

  /**
   * Supervisor calls this to find stale jobs (dead workers)
   */
  async findStaleJobs(stalledMs = 35000): Promise<JobRecord[]> {
    return this.store.findStaleRunning(stalledMs);
  }

  /**
   * Recovery handler: restart stale job
   */
  async recoverJob(jobId: string): Promise<void> {
    const job = await this.store.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Has checkpoint? Reset to created for retry
    if (job.checkpointData) {
      await this.store.setState(jobId, 'created');
      return;
    }

    // No checkpoint? Mark as failed
    await this.store.setError(
      jobId,
      'Worker lost connection - no checkpoint available for recovery'
    );
  }

  /**
   * Clear checkpoint data for a job
   */
  async clearCheckpoint(jobId: string): Promise<void> {
    await this.store.clearCheckpoint(jobId);
  }

  /**
   * Get resumable jobs (for resume UI)
   */
  async getResumableJobs(userId: string): Promise<JobRecord[]> {
    const paused = await this.store.list({
      userId,
      state: 'paused',
    });

    return paused.filter(j => !!j.checkpointData);
  }

  /**
   * Get repository stats
   */
  async getStats() {
    return this.store.getStats();
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string) {
    const allJobs = await this.getUserJobs(userId, 1000);

    const byState: Record<string, number> = {};
    let totalTime = 0;
    let completedCount = 0;

    allJobs.forEach(job => {
      byState[job.state] = (byState[job.state] || 0) + 1;

      if (job.state === 'completed' && job.startedAt) {
        totalTime += (job.completedAt || Date.now()) - job.startedAt;
        completedCount++;
      }
    });

    return {
      totalJobs: allJobs.length,
      byState,
      avgDuration: completedCount > 0 ? totalTime / completedCount : 0,
      completedCount,
    };
  }
}

// Export singleton instance
export const jobRepository = new JobRepository(jobStore);
