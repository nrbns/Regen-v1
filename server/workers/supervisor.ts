/**
 * Worker Supervisor
 * Monitors job health, detects stalled workers, and initiates recovery
 *
 * Responsibilities:
 * - Track worker heartbeats (jobId → worker signal)
 * - Detect stalled jobs (no heartbeat in N seconds)
 * - Attempt recovery (move to paused → can be resumed)
 * - Fail permanently broken jobs (after max retries)
 * - Notify UI of state changes via realtime
 *
 * Strategy:
 * 1. Every worker calls jobRepository.heartbeat(jobId) periodically (5s)
 * 2. Supervisor polls findStaleRunning() every 10s
 * 3. If found, mark paused (checkpoint exists) or failed (no checkpoint)
 * 4. Emit event so UI shows recovery toast
 */

import type { SocketIOServer } from 'socket.io';
import { jobRepository } from '../jobs/repository';
import { publishJobEvent } from '../realtime';
import type { JobRealtimeEvent } from '../realtime';
import { EVENTS } from '../../packages/shared/events';

/**
 * Supervisor configuration
 */
export interface SupervisorConfig {
  // Stale detection
  stalledMs?: number; // Default: 30000ms (30s without heartbeat)
  pollIntervalMs?: number; // Default: 10000ms (check every 10s)
  // Recovery
  maxRecoveryAttempts?: number; // Default: 3
  recoveryBackoffMs?: number; // Default: 5000ms
  // Cleanup
  cleanupBatchSize?: number; // Default: 100 jobs at a time
}

/**
 * Worker supervisor - manages job lifecycle and recovery
 */
export class WorkerSupervisor {
  private config: Required<SupervisorConfig>;
  private supervisorInterval: NodeJS.Timeout | null = null;
  private recoveryAttempts: Map<string, number> = new Map();
  private io: SocketIOServer | null = null;
  private redisClient: any = null;
  private isRunning = false;

  constructor(config: SupervisorConfig = {}) {
    this.config = {
      stalledMs: config.stalledMs || 30000,
      pollIntervalMs: config.pollIntervalMs || 10000,
      maxRecoveryAttempts: config.maxRecoveryAttempts || 3,
      recoveryBackoffMs: config.recoveryBackoffMs || 5000,
      cleanupBatchSize: config.cleanupBatchSize || 100,
    };
  }

  /**
   * Start supervisor
   */
  async start(io?: SocketIOServer, redisClient?: any): Promise<void> {
    if (this.isRunning) {
      console.warn('[Supervisor] Already running, ignoring start request');
      return;
    }

    this.io = io || null;
    this.redisClient = redisClient || null;
    this.isRunning = true;

    console.log(`[Supervisor] Started (stalled threshold: ${this.config.stalledMs}ms)`);

    // Start polling loop
    this.supervisorInterval = setInterval(
      () => this.monitorAndRecover().catch((error) => {
        console.error('[Supervisor] Error in monitor loop:', error);
      }),
      this.config.pollIntervalMs
    );
  }

  /**
   * Stop supervisor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.supervisorInterval) {
      clearInterval(this.supervisorInterval);
      this.supervisorInterval = null;
    }

    this.isRunning = false;
    console.log('[Supervisor] Stopped');
  }

  /**
   * Main monitoring loop
   */
  private async monitorAndRecover(): Promise<void> {
    try {
      // Find stalled jobs
      const stalled = await jobRepository.findStaleJobs(this.config.stalledMs);

      if (stalled.length === 0) return;

      console.log(`[Supervisor] Found ${stalled.length} stalled jobs`);

      // Process each stalled job
      for (const job of stalled) {
        await this.attemptRecovery(job.id);
      }
    } catch (error) {
      console.error('[Supervisor] Error checking for stalled jobs:', error);
    }
  }

  /**
   * Attempt recovery for a single stalled job
   */
  private async attemptRecovery(jobId: string): Promise<void> {
    try {
      const job = await jobRepository.getJob(jobId);

      if (!job) {
        console.warn(`[Supervisor] Job ${jobId} not found for recovery`);
        return;
      }

      // Don't recover jobs that are already in terminal states
      if (['completed', 'failed', 'cancelled'].includes(job.state)) {
        return;
      }

      // Check recovery attempts
      const attempts = this.recoveryAttempts.get(jobId) || 0;

      if (attempts >= this.config.maxRecoveryAttempts) {
        await this.failJob(job.id, 'Worker stalled - max recovery attempts exceeded');
        this.recoveryAttempts.delete(jobId);
        return;
      }

      // Attempt recovery based on checkpoint
      if (job.checkpointData) {
        // Has checkpoint - pause and mark resumable
        await this.pauseForResume(job.id);
        this.recoveryAttempts.set(jobId, attempts + 1);
      } else {
        // No checkpoint - fail immediately
        await this.failJob(job.id, 'Worker stalled - no checkpoint available');
        this.recoveryAttempts.delete(jobId);
      }
    } catch (error) {
      console.error(`[Supervisor] Recovery failed for ${jobId}:`, error);
    }
  }

  /**
   * Pause job for user resume
   */
  private async pauseForResume(jobId: string): Promise<void> {
    try {
      const job = await jobRepository.getJob(jobId);

      if (!job) return;

      // Update to paused state
      await jobRepository.pause(jobId);

      console.log(`[Supervisor] Paused ${jobId} for user recovery`);

      // Emit event
      await this.emitRecoveryEvent(job.userId, jobId, 'paused', {
        reason: 'Worker stalled - job saved and can be resumed',
        checkpoint: !!job.checkpointData,
      });
    } catch (error) {
      console.error(`[Supervisor] Failed to pause job ${jobId}:`, error);
    }
  }

  /**
   * Fail job permanently
   */
  private async failJob(jobId: string, reason: string): Promise<void> {
    try {
      const job = await jobRepository.getJob(jobId);

      if (!job) return;

      // Mark as failed
      await jobRepository.markFailed(jobId, reason);

      console.log(`[Supervisor] Failed ${jobId}: ${reason}`);

      // Emit event
      await this.emitRecoveryEvent(job.userId, jobId, 'failed', {
        reason,
        recoveryAttempts: this.recoveryAttempts.get(jobId) || 0,
      });
    } catch (error) {
      console.error(`[Supervisor] Failed to mark job as failed ${jobId}:`, error);
    }
  }

  /**
   * Emit recovery event to UI
   */
  private async emitRecoveryEvent(
    userId: string,
    jobId: string,
    status: 'paused' | 'failed',
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Emit via Socket.IO if available
      if (this.io) {
        this.io.to(`user:${userId}`).emit('job:recovery', {
          jobId,
          status,
          timestamp: Date.now(),
          ...metadata,
        });
      }

      // Publish to Redis if available
      if (this.redisClient) {
        const event: JobRealtimeEvent = {
          type: status === 'failed' ? EVENTS.JOB_FAILED : EVENTS.JOB_PROGRESS,
          jobId,
          userId,
          data: { id: jobId, userId, state: status },
          timestamp: Date.now(),
        };

        await publishJobEvent(this.redisClient, event);
      }
    } catch (error) {
      console.error('[Supervisor] Failed to emit recovery event:', error);
    }
  }

  /**
   * Get supervisor status
   */
  getStatus(): {
    running: boolean;
    stalledThresholdMs: number;
    recoveryAttempts: Record<string, number>;
    nextCheckMs: number;
  } {
    const nextCheck = this.supervisorInterval
      ? this.config.pollIntervalMs
      : 0;

    return {
      running: this.isRunning,
      stalledThresholdMs: this.config.stalledMs,
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
      nextCheckMs: nextCheck,
    };
  }

  /**
   * Manual recovery trigger (for testing)
   */
  async triggerRecovery(jobId: string): Promise<void> {
    console.log(`[Supervisor] Manual recovery triggered for ${jobId}`);
    await this.attemptRecovery(jobId);
  }

  /**
   * Reset recovery attempts for a job
   */
  resetRecoveryAttempts(jobId: string): void {
    this.recoveryAttempts.delete(jobId);
  }

  /**
   * Cleanup old recovery attempts
   */
  async cleanupRecoveryState(): Promise<void> {
    try {
      // Get all jobs that aren't running
      const completedJobs = await jobRepository.jobRepository.store.list({
        state: 'completed',
        limit: this.config.cleanupBatchSize,
      });

      const failedJobs = await jobRepository.jobRepository.store.list({
        state: 'failed',
        limit: this.config.cleanupBatchSize,
      });

      const allTerminal = [...completedJobs, ...failedJobs];

      // Clear recovery attempts for terminal jobs
      for (const job of allTerminal) {
        this.recoveryAttempts.delete(job.id);
      }

      if (allTerminal.length > 0) {
        console.log(`[Supervisor] Cleaned up recovery state for ${allTerminal.length} jobs`);
      }
    } catch (error) {
      console.error('[Supervisor] Cleanup failed:', error);
    }
  }
}

/**
 * Export singleton instance
 */
export const supervisor = new WorkerSupervisor();

/**
 * Start supervisor on app initialization
 */
export async function initSupervisor(io?: SocketIOServer, redisClient?: any): Promise<void> {
  await supervisor.start(io, redisClient);

  // Periodic cleanup
  setInterval(() => {
    supervisor.cleanupRecoveryState().catch((error) => {
      console.error('[Supervisor] Cleanup error:', error);
    });
  }, 300000); // Every 5 minutes
}

/**
 * Graceful shutdown
 */
export async function shutdownSupervisor(): Promise<void> {
  await supervisor.stop();
}
