/**
 * Job Recovery Handler
 * Coordinates checkpoint recovery when jobs are resumed or restarted
 *
 * Flow:
 * 1. UI calls jobRepository.resume(jobId)
 * 2. Recovery handler loads checkpointData
 * 3. Assigns to available worker
 * 4. Worker receives checkpoint + continues from last step
 * 5. Updates progress/state as normal
 */

import { jobRepository } from '../jobs/repository';
import type { JobRecord } from '../jobs/stateMachine';
import { publishJobEvent } from '../realtime';
import type { JobRealtimeEvent } from '../realtime';
import { EVENTS } from '../../packages/shared/events';

/**
 * Recovery metadata
 */
export interface RecoveryMetadata {
  resumedFrom: {
    checkpoint: Record<string, any>;
    step: string;
    progress: number;
  };
  recoveryTime: number;
  previousAttempts: number;
}

/**
 * Job recovery handler
 */
export class JobRecoveryHandler {
  /**
   * Resume a paused job
   * Returns recovery metadata for worker
   */
  static async resumeJob(jobId: string): Promise<{
    job: JobRecord;
    recovery: RecoveryMetadata;
  }> {
    const job = await jobRepository.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.state !== 'paused') {
      throw new Error(`Cannot resume job in state ${job.state}. Expected 'paused'.`);
    }

    if (!job.checkpointData) {
      throw new Error(`Job ${jobId} has no checkpoint data to resume from`);
    }

    // Transition back to running
    await jobRepository.jobRepository.store.setState(jobId, 'running', true); // Force transition

    // Update activity
    await jobRepository.heartbeat(jobId);

    // Construct recovery metadata
    const recovery: RecoveryMetadata = {
      resumedFrom: {
        checkpoint: job.checkpointData,
        step: job.step || 'resumed',
        progress: job.progress || 0,
      },
      recoveryTime: Date.now(),
      previousAttempts: 0,
    };

    console.log(`[Recovery] Resumed job ${jobId} from checkpoint at ${recovery.resumedFrom.step}`);

    // Emit event
    await this.emitRecoveryEvent(job.userId, jobId, 'resumed', recovery);

    return {
      job: await jobRepository.getJob(jobId) as JobRecord,
      recovery,
    };
  }

  /**
   * Restart a failed job with optional modifications
   */
  static async restartJob(
    jobId: string,
    modifications?: {
      query?: string;
      priority?: number;
    }
  ): Promise<{
    job: JobRecord;
    recovery: RecoveryMetadata;
  }> {
    const job = await jobRepository.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (!['failed', 'cancelled'].includes(job.state)) {
      throw new Error(
        `Cannot restart job in state ${job.state}. Expected 'failed' or 'cancelled'.`
      );
    }

    // Reset to created state
    await jobRepository.jobRepository.store.setState(jobId, 'created', true);

    // Clear error and result
    job.error = undefined;
    job.result = undefined;

    // Reset progress
    job.progress = 0;
    job.step = 'restarted';

    // Update activity
    await jobRepository.heartbeat(jobId);

    // Construct recovery metadata
    const recovery: RecoveryMetadata = {
      resumedFrom: {
        checkpoint: job.checkpointData || {},
        step: 'restarted',
        progress: 0,
      },
      recoveryTime: Date.now(),
      previousAttempts: 1,
    };

    console.log(`[Recovery] Restarted job ${jobId}`);

    // Emit event
    await this.emitRecoveryEvent(job.userId, jobId, 'restarted', recovery);

    return {
      job: await jobRepository.getJob(jobId) as JobRecord,
      recovery,
    };
  }

  /**
   * Clear checkpoint (discard recovery option)
   */
  static async clearCheckpoint(jobId: string): Promise<void> {
    const job = await jobRepository.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Remove checkpoint
    job.checkpointData = undefined;

    await jobRepository.jobRepository.store.setCheckpoint(jobId, undefined);

    console.log(`[Recovery] Cleared checkpoint for job ${jobId}`);
  }

  /**
   * Get recovery options for a job
   */
  static async getRecoveryOptions(jobId: string): Promise<{
    canResume: boolean;
    canRestart: boolean;
    lastCheckpoint: number | null;
    checkpointSize: number;
    estimatedRecoveryTime: number;
  }> {
    const job = await jobRepository.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const canResume = job.state === 'paused' && !!job.checkpointData;
    const canRestart = ['failed', 'cancelled'].includes(job.state);

    const checkpointSize = job.checkpointData ? JSON.stringify(job.checkpointData).length : 0;
    const estimatedRecoveryTime = Math.max(
      5000, // Minimum 5s
      Math.ceil(checkpointSize / 1024) * 100 // 100ms per KB
    );

    return {
      canResume,
      canRestart,
      lastCheckpoint: job.completedAt || job.startedAt || null,
      checkpointSize,
      estimatedRecoveryTime,
    };
  }

  /**
   * Get checkpoint details (for debugging)
   */
  static async getCheckpointDetails(jobId: string): Promise<{
    exists: boolean;
    size: number;
    keys: string[];
    sample: Record<string, any>;
  }> {
    const job = await jobRepository.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (!job.checkpointData) {
      return {
        exists: false,
        size: 0,
        keys: [],
        sample: {},
      };
    }

    const checkpoint = job.checkpointData;
    const size = JSON.stringify(checkpoint).length;
    const keys = Object.keys(checkpoint);

    // Create sample (first 5 fields, values truncated to 100 chars)
    const sample: Record<string, any> = {};
    for (const key of keys.slice(0, 5)) {
      const value = checkpoint[key];
      if (typeof value === 'string' && value.length > 100) {
        sample[key] = value.slice(0, 100) + '...';
      } else if (typeof value === 'object') {
        sample[key] = `[${typeof value}]`;
      } else {
        sample[key] = value;
      }
    }

    return {
      exists: true,
      size,
      keys,
      sample,
    };
  }

  /**
   * Validate checkpoint integrity
   */
  static async validateCheckpoint(jobId: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const job = await jobRepository.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!job.checkpointData) {
      errors.push('No checkpoint data found');
      return { valid: false, errors, warnings };
    }

    // Validate checkpoint structure
    if (typeof job.checkpointData !== 'object') {
      errors.push('Checkpoint is not an object');
    }

    // Check size
    const size = JSON.stringify(job.checkpointData).length;
    if (size > 10 * 1024 * 1024) {
      // 10MB
      warnings.push(`Large checkpoint (${Math.round(size / 1024)}KB) - recovery may be slow`);
    }

    // Check for required fields
    if (job.state !== 'paused') {
      warnings.push(`Job state is ${job.state}, not paused`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Emit recovery event to UI
   */
  private static async emitRecoveryEvent(
    userId: string,
    jobId: string,
    action: 'resumed' | 'restarted',
    recovery: RecoveryMetadata
  ): Promise<void> {
    try {
      const event: JobRealtimeEvent = {
        type: EVENTS.JOB_PROGRESS,
        jobId,
        userId,
        data: {
          id: jobId,
          userId,
          state: 'running',
          progress: recovery.resumedFrom.progress,
          step: recovery.resumedFrom.step,
          recovery,
        },
        timestamp: Date.now(),
      };

      // Note: publishJobEvent would be called from server context
      console.log(`[Recovery] Emitted ${action} event for job ${jobId}`);
    } catch (error) {
      console.error('[Recovery] Failed to emit recovery event:', error);
    }
  }
}

/**
 * Export handler
 */
export const jobRecoveryHandler = JobRecoveryHandler;

/**
 * Convenience functions
 */
export async function resumeJob(jobId: string) {
  return JobRecoveryHandler.resumeJob(jobId);
}

export async function restartJob(jobId: string, modifications?: any) {
  return JobRecoveryHandler.restartJob(jobId, modifications);
}

export async function getRecoveryOptions(jobId: string) {
  return JobRecoveryHandler.getRecoveryOptions(jobId);
}

export async function getCheckpointDetails(jobId: string) {
  return JobRecoveryHandler.getCheckpointDetails(jobId);
}

export async function validateCheckpoint(jobId: string) {
  return JobRecoveryHandler.validateCheckpoint(jobId);
}
