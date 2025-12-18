/**
 * Job State Machine
 * Defines valid state transitions and business logic
 *
 * States:
 *   created → running → (paused/completed/failed)
 *   paused → resumed → running
 *   * → cancelled (at any point)
 */

import type { JobState } from '../../packages/shared/events';

export interface JobRecord {
  id: string;
  userId: string;
  type: string;
  query?: string;
  state: JobState;
  progress: number; // 0-100
  step: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  result?: any;
  checkpointData?: any;
  lastActivity: number;
}

export interface StateTransition {
  from: JobState;
  to: JobState;
  allowed: boolean;
  reason?: string;
}

export class JobStateMachine {
  /**
   * Valid state transitions
   */
  private static readonly TRANSITIONS: Record<JobState, JobState[]> = {
    created: ['running', 'cancelled'],
    running: ['paused', 'completed', 'failed', 'cancelled'],
    paused: ['running', 'cancelled'],
    completed: ['cancelled'], // Already done, can only cancel for audit trail
    failed: ['cancelled'], // Failed, can only cancel
    cancelled: [], // Terminal state
  };

  /**
   * Check if transition is allowed
   */
  static canTransition(from: JobState, to: JobState): boolean {
    const allowed = this.TRANSITIONS[from]?.includes(to) ?? false;
    return allowed;
  }

  /**
   * Get valid next states
   */
  static getValidNextStates(current: JobState): JobState[] {
    return this.TRANSITIONS[current] || [];
  }

  /**
   * Validate and perform transition
   */
  static transition(
    job: JobRecord,
    newState: JobState
  ): { success: boolean; job?: JobRecord; error?: string } {
    if (!this.canTransition(job.state, newState)) {
      return {
        success: false,
        error: `Cannot transition from ${job.state} to ${newState}`,
      };
    }

    const updated = { ...job, state: newState, lastActivity: Date.now() };

    // Set timestamps based on state
    if (newState === 'running' && !job.startedAt) {
      updated.startedAt = Date.now();
    } else if (newState === 'completed') {
      updated.completedAt = Date.now();
    } else if (newState === 'failed') {
      updated.failedAt = Date.now();
    }

    return { success: true, job: updated };
  }

  /**
   * Check if job is in terminal state
   */
  static isTerminal(state: JobState): boolean {
    return state === 'completed' || state === 'failed' || state === 'cancelled';
  }

  /**
   * Check if job is active
   */
  static isActive(state: JobState): boolean {
    return state === 'running' || state === 'paused';
  }
}

/**
 * In-memory job store (for now, will be replaced with DB)
 */
export class InMemoryJobStore {
  private jobs = new Map<string, JobRecord>();
  private userJobs = new Map<string, Set<string>>(); // userId → jobIds

  create(job: JobRecord): JobRecord {
    this.jobs.set(job.id, job);

    // Track user's jobs
    if (!this.userJobs.has(job.userId)) {
      this.userJobs.set(job.userId, new Set());
    }
    this.userJobs.get(job.userId)!.add(job.id);

    return job;
  }

  get(jobId: string): JobRecord | null {
    return this.jobs.get(jobId) || null;
  }

  update(job: JobRecord): JobRecord {
    this.jobs.set(job.id, job);
    return job;
  }

  getUserJobs(userId: string): JobRecord[] {
    const jobIds = this.userJobs.get(userId) || new Set();
    return Array.from(jobIds)
      .map(id => this.jobs.get(id))
      .filter((j): j is JobRecord => j !== undefined);
  }

  delete(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.delete(jobId);
      const userJobs = this.userJobs.get(job.userId);
      if (userJobs) {
        userJobs.delete(jobId);
      }
    }
  }

  /**
   * Get jobs older than specified time (for cleanup)
   */
  getStaleJobs(maxAgeMins: number): JobRecord[] {
    const cutoff = Date.now() - maxAgeMins * 60 * 1000;
    return Array.from(this.jobs.values()).filter(
      j => JobStateMachine.isTerminal(j.state) && j.lastActivity < cutoff
    );
  }

  /**
   * Get active jobs (for monitoring/recovery)
   */
  getActiveJobs(): JobRecord[] {
    return Array.from(this.jobs.values()).filter(j => JobStateMachine.isActive(j.state));
  }

  /**
   * Count jobs by state
   */
  getStatsCounts(): Record<JobState, number> {
    const counts: Record<JobState, number> = {
      created: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const job of this.jobs.values()) {
      counts[job.state]++;
    }

    return counts;
  }
}
