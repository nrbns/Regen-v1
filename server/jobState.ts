/**
 * GOAL:
 * Implement a robust job lifecycle state machine.
 *
 * STATES:
 * - created
 * - running
 * - checkpointed
 * - completed
 * - failed
 * - cancelled
 *
 * REQUIREMENTS:
 * - Persist job state in DB
 * - Enforce valid transitions only
 * - Support resume from checkpoint
 * - Support cancel and cleanup
 * - Prevent orphan jobs
 *
 * Include unit-testable pure functions.
 */

export type JobState =
  | 'created'
  | 'running'
  | 'checkpointed'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Job {
  id: string;
  userId: string;
  type: string;
  state: JobState;
  input: any;
  output?: any;
  error?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  checkpoint?: {
    sequence: number;
    partialOutput: any;
    timestamp: number;
  };
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  cancelledAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
  created: ['running', 'cancelled'],
  running: ['checkpointed', 'completed', 'failed', 'cancelled'],
  checkpointed: ['running', 'completed', 'failed', 'cancelled'],
  completed: [], // Terminal state
  failed: ['running'], // Can retry
  cancelled: [], // Terminal state
};

/**
 * Check if state transition is valid
 */
export function isValidTransition(from: JobState, to: JobState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Get all valid next states for current state
 */
export function getValidNextStates(current: JobState): JobState[] {
  return VALID_TRANSITIONS[current];
}

/**
 * Check if state is terminal (no further transitions)
 */
export function isTerminalState(state: JobState): boolean {
  return VALID_TRANSITIONS[state].length === 0;
}

/**
 * State transition errors
 */
export class InvalidStateTransitionError extends Error {
  constructor(from: JobState, to: JobState) {
    super(`Invalid state transition: ${from} -> ${to}`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`);
    this.name = 'JobNotFoundError';
  }
}

/**
 * Job State Manager - Manages job lifecycle
 */
export class JobStateManager {
  private jobs = new Map<string, Job>();
  private persistFn?: (job: Job) => Promise<void>;
  private loadFn?: (jobId: string) => Promise<Job | null>;

  constructor(options?: {
    persist?: (job: Job) => Promise<void>;
    load?: (jobId: string) => Promise<Job | null>;
  }) {
    this.persistFn = options?.persist;
    this.loadFn = options?.load;
  }

  /**
   * Create a new job
   */
  async createJob(params: {
    id: string;
    userId: string;
    type: string;
    input: any;
    metadata?: Record<string, any>;
  }): Promise<Job> {
    const job: Job = {
      ...params,
      state: 'created',
      createdAt: Date.now(),
    };

    this.jobs.set(job.id, job);
    await this.persist(job);

    console.log(`[JobState] Job ${job.id} created`);
    return job;
  }

  /**
   * Transition job to new state
   */
  async transitionTo(jobId: string, newState: JobState, data?: Partial<Job>): Promise<Job> {
    const job = await this.getJob(jobId);

    // Validate transition
    if (!isValidTransition(job.state, newState)) {
      throw new InvalidStateTransitionError(job.state, newState);
    }

    // Update state and timestamps
    const oldState = job.state;
    job.state = newState;

    // Set appropriate timestamp
    switch (newState) {
      case 'running':
        job.startedAt = Date.now();
        break;
      case 'completed':
        job.completedAt = Date.now();
        break;
      case 'failed':
        job.failedAt = Date.now();
        break;
      case 'cancelled':
        job.cancelledAt = Date.now();
        break;
    }

    // Merge additional data
    if (data) {
      Object.assign(job, data);
    }

    await this.persist(job);

    console.log(`[JobState] Job ${jobId} transitioned: ${oldState} -> ${newState}`);
    return job;
  }

  /**
   * Start job execution
   */
  async startJob(jobId: string): Promise<Job> {
    return this.transitionTo(jobId, 'running');
  }

  /**
   * Save checkpoint during execution
   */
  async saveCheckpoint(
    jobId: string,
    checkpoint: { sequence: number; partialOutput: any }
  ): Promise<Job> {
    return this.transitionTo(jobId, 'checkpointed', {
      checkpoint: {
        ...checkpoint,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Resume job from checkpoint
   */
  async resumeJob(jobId: string): Promise<Job> {
    const job = await this.getJob(jobId);

    if (job.state !== 'checkpointed' && job.state !== 'failed') {
      throw new Error(`Cannot resume job in state: ${job.state}`);
    }

    return this.transitionTo(jobId, 'running');
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: { current: number; total: number }): Promise<Job> {
    const job = await this.getJob(jobId);

    if (job.state !== 'running') {
      throw new Error(`Cannot update progress for job in state: ${job.state}`);
    }

    job.progress = {
      ...progress,
      percentage: (progress.current / progress.total) * 100,
    };

    await this.persist(job);
    return job;
  }

  /**
   * Complete job successfully
   */
  async completeJob(jobId: string, output: any): Promise<Job> {
    return this.transitionTo(jobId, 'completed', { output });
  }

  /**
   * Fail job with error
   */
  async failJob(jobId: string, error: string, partialOutput?: any): Promise<Job> {
    return this.transitionTo(jobId, 'failed', {
      error,
      output: partialOutput,
    });
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<Job> {
    return this.transitionTo(jobId, 'cancelled');
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job> {
    // Try memory first
    let job = this.jobs.get(jobId);

    // Try persistence layer if available
    if (!job && this.loadFn) {
      job = await this.loadFn(jobId);
      if (job) {
        this.jobs.set(jobId, job);
      }
    }

    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    return job;
  }

  /**
   * Get all jobs for user
   */
  async getJobsByUser(userId: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Get jobs by state
   */
  async getJobsByState(state: JobState): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter(job => job.state === state);
  }

  /**
   * Cleanup completed/failed jobs older than TTL
   */
  async cleanupOldJobs(ttlMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      const completionTime = job.completedAt || job.failedAt || job.cancelledAt;

      if (completionTime && now - completionTime > ttlMs) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    console.log(`[JobState] Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }

  /**
   * Detect and cleanup orphan jobs (running too long)
   */
  async cleanupOrphanJobs(maxRuntimeMs: number = 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    const runningJobs = await this.getJobsByState('running');

    for (const job of runningJobs) {
      if (job.startedAt && now - job.startedAt > maxRuntimeMs) {
        console.warn(
          `[JobState] Orphan job detected: ${job.id} (running for ${now - job.startedAt}ms)`
        );
        await this.failJob(job.id, 'Job exceeded maximum runtime (orphaned)');
        cleaned++;
      }
    }

    console.log(`[JobState] Cleaned up ${cleaned} orphan jobs`);
    return cleaned;
  }

  /**
   * Get job statistics
   */
  getStatistics(): {
    total: number;
    byState: Record<JobState, number>;
    avgCompletionTime: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const byState: Record<JobState, number> = {
      created: 0,
      running: 0,
      checkpointed: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    jobs.forEach(job => {
      byState[job.state]++;

      if (job.completedAt && job.startedAt) {
        totalCompletionTime += job.completedAt - job.startedAt;
        completedCount++;
      }
    });

    return {
      total: jobs.length,
      byState,
      avgCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
    };
  }

  /**
   * Persist job to storage
   */
  private async persist(job: Job): Promise<void> {
    if (this.persistFn) {
      await this.persistFn(job);
    }
  }

  /**
   * Clear all jobs (for testing)
   */
  clear(): void {
    this.jobs.clear();
  }
}

/**
 * Example: In-memory persistence
 */
export function createInMemoryJobManager(): JobStateManager {
  const storage = new Map<string, Job>();

  return new JobStateManager({
    persist: async (job: Job) => {
      storage.set(job.id, { ...job });
    },
    load: async (jobId: string) => {
      const job = storage.get(jobId);
      return job ? { ...job } : null;
    },
  });
}

/**
 * Example: IndexedDB persistence (browser)
 */
export function createIndexedDBJobManager(dbName: string = 'regen-jobs'): JobStateManager {
  let db: IDBDatabase;

  const initDB = async (): Promise<IDBDatabase> => {
    if (db) return db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onupgradeneeded = event => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains('jobs')) {
          const store = database.createObjectStore('jobs', { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('state', 'state', { unique: false });
        }
      };
    });
  };

  return new JobStateManager({
    persist: async (job: Job) => {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(['jobs'], 'readwrite');
        const store = transaction.objectStore('jobs');
        const request = store.put(job);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
    load: async (jobId: string) => {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(['jobs'], 'readonly');
        const store = transaction.objectStore('jobs');
        const request = store.get(jobId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    },
  });
}
