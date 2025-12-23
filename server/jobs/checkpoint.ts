/**
 * Checkpoint Management
 * Handles saving and restoring job state for resumption
 *
 * Enables:
 * - Job pause/resume
 * - Worker crash recovery
 * - Progress continuation from last checkpoint
 */

import type Redis from 'ioredis';
import type { JobRecord } from './stateMachine';

export interface Checkpoint {
  jobId: string;
  userId: string;
  sequence: number; // Event sequence number
  timestamp: number;
  step: string;
  progress: number; // 0-100
  partialOutput?: string; // Streaming response accumulated so far
  customData?: Record<string, any>; // App-specific checkpoint data
}

export class CheckpointManager {
  private redis: Redis | null;
  private checkpointKeyPrefix = 'checkpoint:';
  private archivePrefix = 'checkpoint:archive:';

  constructor(redis: Redis | null = null) {
    this.redis = redis;
  }

  /**
   * Save checkpoint for a job
   */
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    if (!this.redis) {
      console.warn('[CheckpointManager] Redis not available, checkpoint not saved');
      return;
    }

    try {
      const key = `${this.checkpointKeyPrefix}${checkpoint.jobId}`;
      const data = JSON.stringify(checkpoint);

      // Save with TTL (7 days for long-running jobs)
      await this.redis.setex(key, 7 * 24 * 60 * 60, data);

      console.log(
        `[CheckpointManager] Saved checkpoint for job ${checkpoint.jobId} at step ${checkpoint.step}`
      );
    } catch (error) {
      console.error('[CheckpointManager] Failed to save checkpoint:', error);
      throw error;
    }
  }

  /**
   * Load checkpoint for a job
   */
  async loadCheckpoint(jobId: string): Promise<Checkpoint | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const key = `${this.checkpointKeyPrefix}${jobId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const checkpoint = JSON.parse(data) as Checkpoint;
      console.log(
        `[CheckpointManager] Loaded checkpoint for job ${jobId} at step ${checkpoint.step}`
      );
      return checkpoint;
    } catch (error) {
      console.error('[CheckpointManager] Failed to load checkpoint:', error);
      return null;
    }
  }

  /**
   * Delete checkpoint (after resumption or cancellation)
   */
  async deleteCheckpoint(jobId: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${this.checkpointKeyPrefix}${jobId}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('[CheckpointManager] Failed to delete checkpoint:', error);
    }
  }

  /**
   * Archive checkpoint for historical purposes
   */
  async archiveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${this.archivePrefix}${checkpoint.jobId}:${checkpoint.sequence}`;
      const data = JSON.stringify(checkpoint);

      // Keep archive for 30 days
      await this.redis.setex(key, 30 * 24 * 60 * 60, data);
    } catch (error) {
      console.warn('[CheckpointManager] Failed to archive checkpoint:', error);
    }
  }

  /**
   * Get all checkpoints for a user (for listing resumable jobs)
   */
  async getResumableJobs(userId: string): Promise<Checkpoint[]> {
    if (!this.redis) {
      return [];
    }

    try {
      // Scan for checkpoints (in production, would query DB)
      const keys = await this.redis.keys(`${this.checkpointKeyPrefix}*`);
      const checkpoints: Checkpoint[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const checkpoint = JSON.parse(data) as Checkpoint;
          if (checkpoint.userId === userId) {
            checkpoints.push(checkpoint);
          }
        }
      }

      return checkpoints;
    } catch (error) {
      console.error('[CheckpointManager] Failed to get resumable jobs:', error);
      return [];
    }
  }
}

/**
 * Helper to create checkpoint from job + progress event
 */
export function createCheckpoint(
  job: JobRecord,
  step: string,
  progress: number,
  partialOutput?: string,
  customData?: Record<string, any>
): Checkpoint {
  return {
    jobId: job.id,
    userId: job.userId,
    sequence: Math.floor(Date.now() / 1000), // Simple sequence
    timestamp: Date.now(),
    step,
    progress,
    partialOutput,
    customData,
  };
}

/**
 * Helper to resume a job from checkpoint
 */
export function resumeFromCheckpoint(checkpoint: Checkpoint, job: JobRecord): JobRecord {
  return {
    ...job,
    state: 'running',
    step: checkpoint.step,
    progress: checkpoint.progress,
    lastActivity: Date.now(),
  };
}
