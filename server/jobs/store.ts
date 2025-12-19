/**
 * Job Store Interface
 * Abstraction layer for job persistence
 *
 * Implementation agnostic:
 * - Can be SQLite, PostgreSQL, MongoDB, etc.
 * - Single source of truth for all job data
 * - Enforces immutable transitions via state machine
 */

import type { JobState } from '../../packages/shared/events';
import type { JobRecord } from './stateMachine';

/**
 * Query filters for job lookups
 */
export interface JobQuery {
  userId?: string;
  state?: JobState;
  type?: string;
  createdAfter?: number;
  createdBefore?: number;
  limit?: number;
  offset?: number;
}

/**
 * Store interface - implement once, use everywhere
 */
export interface IJobStore {
  // === Create ===
  /**
   * Create new job and persist
   * Returns: job ID
   */
  create(record: Omit<JobRecord, 'id' | 'createdAt' | 'lastActivity'>): Promise<string>;

  // === Read ===
  /**
   * Get job by ID
   */
  get(jobId: string): Promise<JobRecord | null>;

  /**
   * List jobs matching criteria
   */
  list(query: JobQuery): Promise<JobRecord[]>;

  /**
   * Find first job matching state
   */
  findOne(query: JobQuery): Promise<JobRecord | null>;

  /**
   * Count jobs matching criteria
   */
  count(query: JobQuery): Promise<number>;

  // === Update ===
  /**
   * Update job state (with validation)
   * Throws if transition invalid
   */
  setState(jobId: string, state: JobState): Promise<void>;

  /**
   * Update progress + step
   * Does not change state
   */
  setProgress(jobId: string, progress: number, step: string): Promise<void>;

  /**
   * Update error and mark as failed
   */
  setError(jobId: string, error: string): Promise<void>;

  /**
   * Save checkpoint for resume
   */
  checkpoint(jobId: string, data: Record<string, any>): Promise<void>;

  /**
   * Clear checkpoint data (remove resume option)
   */
  clearCheckpoint(jobId: string): Promise<void>;

  /**
   * Set final result and mark complete
   */
  setResult(jobId: string, result: Record<string, any>): Promise<void>;

  /**
   * Update last activity timestamp (used for heartbeat)
   */
  heartbeat(jobId: string): Promise<void>;

  // === Delete / Cancel ===
  /**
   * Cancel job (marks as cancelled)
   */
  cancel(jobId: string): Promise<void>;

  /**
   * Hard delete (use sparingly - audit trail loss)
   */
  delete(jobId: string): Promise<void>;

  // === Query ===
  /**
   * Find all running jobs (for supervisor)
   */
  findRunning(): Promise<JobRecord[]>;

  /**
   * Find jobs that need recovery (dead workers)
   */
  findStaleRunning(stalledMs: number): Promise<JobRecord[]>;

  /**
   * Find jobs with checkpoints ready to resume
   */
  findResumable(): Promise<JobRecord[]>;

  /**
   * Get stats (for monitoring)
   */
  getStats(): Promise<{
    total: number;
    byState: Record<JobState, number>;
    avgDuration: number;
    errorCount: number;
  }>;
}

/**
 * In-memory store (development / testing)
 * Useful for Days 1-3 before database is hardened
 */
export class InMemoryJobStore implements IJobStore {
  private jobs = new Map<string, JobRecord>();
  private stateValidation = true;

  async create(record: Omit<JobRecord, 'id' | 'createdAt' | 'lastActivity'>): Promise<string> {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const job: JobRecord = {
      ...record,
      id,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.jobs.set(id, job);
    return id;
  }

  async get(jobId: string): Promise<JobRecord | null> {
    return this.jobs.get(jobId) || null;
  }

  async list(query: JobQuery): Promise<JobRecord[]> {
    let results = Array.from(this.jobs.values());

    if (query.userId) results = results.filter(j => j.userId === query.userId);
    if (query.state) results = results.filter(j => j.state === query.state);
    if (query.type) results = results.filter(j => j.type === query.type);
    if (query.createdAfter) results = results.filter(j => j.createdAt >= query.createdAfter);
    if (query.createdBefore) results = results.filter(j => j.createdAt <= query.createdBefore);

    if (query.offset) results = results.slice(query.offset);
    if (query.limit) results = results.slice(0, query.limit);

    return results;
  }

  async findOne(query: JobQuery): Promise<JobRecord | null> {
    const results = await this.list({ ...query, limit: 1 });
    return results[0] || null;
  }

  async count(query: JobQuery): Promise<number> {
    const results = await this.list(query);
    return results.length;
  }

  async setState(jobId: string, state: JobState): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Validate transition (optional: can disable for testing)
    if (this.stateValidation) {
      const validTransitions: Record<JobState, JobState[]> = {
        created: ['running', 'cancelled'],
        running: ['paused', 'completed', 'failed', 'cancelled'],
        paused: ['running', 'cancelled'],
        completed: ['cancelled'],
        failed: ['cancelled'],
        cancelled: [],
      };

      if (!validTransitions[job.state]?.includes(state)) {
        throw new Error(`Invalid transition: ${job.state} → ${state}`);
      }
    }

    job.state = state;
    job.lastActivity = Date.now();

    if (state === 'running' && !job.startedAt) job.startedAt = Date.now();
    if (state === 'completed') job.completedAt = Date.now();
    if (state === 'failed') job.failedAt = Date.now();

    this.jobs.set(jobId, job);
  }

  async setProgress(jobId: string, progress: number, step: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.progress = Math.min(100, Math.max(0, progress));
    job.step = step;
    job.lastActivity = Date.now();

    this.jobs.set(jobId, job);
  }

  async setError(jobId: string, error: string): Promise<void> {
    await this.setState(jobId, 'failed');
    const job = this.jobs.get(jobId)!;
    job.error = error;
    this.jobs.set(jobId, job);
  }

  async checkpoint(jobId: string, data: Record<string, any>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.checkpointData = {
      ...data,
      timestamp: Date.now(),
    };
    job.lastActivity = Date.now();

    this.jobs.set(jobId, job);
  }

  async clearCheckpoint(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    job.checkpointData = undefined;
    job.lastActivity = Date.now();
    this.jobs.set(jobId, job);
  }

  async setResult(jobId: string, result: Record<string, any>): Promise<void> {
    await this.setState(jobId, 'completed');
    const job = this.jobs.get(jobId)!;
    job.result = result;
    this.jobs.set(jobId, job);
  }

  async heartbeat(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.lastActivity = Date.now();
    this.jobs.set(jobId, job);
  }

  async cancel(jobId: string): Promise<void> {
    await this.setState(jobId, 'cancelled');
  }

  async delete(jobId: string): Promise<void> {
    this.jobs.delete(jobId);
  }

  async findRunning(): Promise<JobRecord[]> {
    return this.list({ state: 'running' });
  }

  async findStaleRunning(stalledMs: number): Promise<JobRecord[]> {
    const running = await this.findRunning();
    const now = Date.now();
    return running.filter(j => now - j.lastActivity > stalledMs);
  }

  async findResumable(): Promise<JobRecord[]> {
    const jobs = Array.from(this.jobs.values());
    return jobs.filter(j => j.checkpointData && j.state === 'paused');
  }

  async getStats() {
    const jobs = Array.from(this.jobs.values());
    const byState: Record<JobState, number> = {
      created: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    let totalDuration = 0;
    let completedCount = 0;
    let errorCount = 0;

    jobs.forEach(job => {
      byState[job.state]++;

      if (job.state === 'completed' && job.startedAt) {
        totalDuration += (job.completedAt || Date.now()) - job.startedAt;
        completedCount++;
      }

      if (job.state === 'failed') errorCount++;
    });

    return {
      total: jobs.length,
      byState,
      avgDuration: completedCount > 0 ? totalDuration / completedCount : 0,
      errorCount,
    };
  }
}

// Export: Use this for now, swap for DB implementation later
export const jobStore = new InMemoryJobStore();
