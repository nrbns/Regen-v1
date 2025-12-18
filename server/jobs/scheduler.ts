/**
 * Job Scheduler
 * Handles:
 * - Cleanup of stale jobs
 * - Worker crash recovery
 * - Job timeout handling
 * - Metrics collection
 */

import { InMemoryJobStore, type JobRecord } from './stateMachine';
import type Redis from 'ioredis';

export interface SchedulerConfig {
  staleJobMaxAgeMins: number; // Age before cleanup
  activeJobTimeoutMins: number; // Timeout for "stuck" running jobs
  checkIntervalSecs: number; // How often to run checks
  enableAutoCleanup: boolean;
  enableAutoRecovery: boolean;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  staleJobMaxAgeMins: 1440, // 24 hours
  activeJobTimeoutMins: 60, // 1 hour
  checkIntervalSecs: 300, // 5 minutes
  enableAutoCleanup: true,
  enableAutoRecovery: true,
};

export class JobScheduler {
  private store: InMemoryJobStore;
  private redis: Redis | null;
  private config: SchedulerConfig;
  private intervalId: NodeJS.Timer | null = null;
  private isRunning = false;

  private metrics = {
    cleanupCount: 0,
    recoveryCount: 0,
    timeoutCount: 0,
    lastRun: 0,
    lastError: null as Error | null,
  };

  constructor(
    store: InMemoryJobStore,
    redis: Redis | null = null,
    config?: Partial<SchedulerConfig>
  ) {
    this.store = store;
    this.redis = redis;
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }

  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) return;

    console.log('[JobScheduler] Starting job scheduler');
    this.isRunning = true;

    // Run immediately
    this.tick();

    // Then run on interval
    this.intervalId = setInterval(() => this.tick(), this.config.checkIntervalSecs * 1000);
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('[JobScheduler] Stopping job scheduler');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Main scheduler tick
   */
  private async tick(): Promise<void> {
    try {
      this.metrics.lastRun = Date.now();

      // Cleanup stale jobs
      if (this.config.enableAutoCleanup) {
        await this.cleanupStaleJobs();
      }

      // Recover from worker crashes
      if (this.config.enableAutoRecovery) {
        await this.recoverHungJobs();
      }

      // Check for timeouts
      await this.checkJobTimeouts();
    } catch (error) {
      this.metrics.lastError = error as Error;
      console.error('[JobScheduler] Error in scheduler tick:', error);
    }
  }

  /**
   * Remove stale completed/failed jobs
   */
  private async cleanupStaleJobs(): Promise<void> {
    const staleJobs = this.store.getStaleJobs(this.config.staleJobMaxAgeMins);

    for (const job of staleJobs) {
      try {
        // Optional: Archive to DB before deleting
        await this.archiveJob(job);

        this.store.delete(job.id);
        this.metrics.cleanupCount++;

        console.log(`[JobScheduler] Cleaned up stale job: ${job.id} (${job.state})`);
      } catch (error) {
        console.error(`[JobScheduler] Error cleaning job ${job.id}:`, error);
      }
    }
  }

  /**
   * Recover jobs stuck in running state (worker crashed)
   */
  private async recoverHungJobs(): Promise<void> {
    const activeJobs = this.store.getActiveJobs();
    const cutoff = Date.now() - this.config.activeJobTimeoutMins * 60 * 1000;

    for (const job of activeJobs) {
      // Check if job hasn't been updated in timeout period
      if (job.lastActivity < cutoff) {
        try {
          // Mark as failed with recovery error
          const recovered = {
            ...job,
            state: 'failed' as const,
            error: `Job hung: no activity for ${this.config.activeJobTimeoutMins} minutes`,
            failedAt: Date.now(),
            lastActivity: Date.now(),
          };

          this.store.update(recovered);
          this.metrics.recoveryCount++;

          // Notify on Redis if available
          if (this.redis) {
            await this.redis.publish(`job:recovered:${job.id}`, JSON.stringify(recovered));
          }

          console.log(`[JobScheduler] Recovered hung job: ${job.id}`);
        } catch (error) {
          console.error(`[JobScheduler] Error recovering job ${job.id}:`, error);
        }
      }
    }
  }

  /**
   * Check for jobs that should timeout
   */
  private async checkJobTimeouts(): Promise<void> {
    const activeJobs = this.store.getActiveJobs();

    for (const job of activeJobs) {
      // If progress hasn't updated recently, mark as stalled
      const stalledThreshold = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - job.lastActivity > stalledThreshold) {
        try {
          // Just update progress to indicate stalling
          const updated = {
            ...job,
            step: `${job.step} (stalled...)`,
            lastActivity: Date.now(),
          };
          this.store.update(updated);
          this.metrics.timeoutCount++;
        } catch (error) {
          console.error(`[JobScheduler] Error updating stalled job ${job.id}:`, error);
        }
      }
    }
  }

  /**
   * Archive job to persistent storage (stub for future DB implementation)
   */
  private async archiveJob(job: JobRecord): Promise<void> {
    // TODO: When DB integration added, archive here
    if (this.redis) {
      try {
        await this.redis.hset(`job:archive`, job.id, JSON.stringify(job));
      } catch (error) {
        console.warn('[JobScheduler] Failed to archive job to Redis:', error);
      }
    }
  }

  /**
   * Get scheduler metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      config: this.config,
      jobCounts: this.store.getStatsCounts(),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      cleanupCount: 0,
      recoveryCount: 0,
      timeoutCount: 0,
      lastRun: 0,
      lastError: null,
    };
  }
}
