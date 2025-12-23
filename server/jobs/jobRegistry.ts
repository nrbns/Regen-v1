import { jobRepository } from './repository';
import type { JobRecord } from './stateMachine';

export interface JobSnapshot {
  id: string;
  userId: string;
  type: string;
  state: JobRecord['state'];
  progress: number;
  step: string;
  lastStep: string;
  lastChunkIndex: number;
  partialOutput: any;
  confidence: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
}

type JobProvider = {
  get(jobId: string): Promise<JobRecord | null> | JobRecord | null;
};

let provider: JobProvider | null = null;

class JobRegistry {
  private cache = new Map<string, JobRecord>();

  async get(jobId: string): Promise<JobRecord | null> {
    const cached = this.cache.get(jobId);
    if (cached) return cached;

    // Prefer injected provider (routes' store) if available
    let job: JobRecord | null = null;
    if (provider) {
      const maybe = await provider.get(jobId as string);
      job = (maybe as JobRecord | null) ?? null;
    } else {
      job = await jobRepository.getJob(jobId);
    }
    if (job) this.cache.set(jobId, job);
    return job;
  }

  update(job: JobRecord): void {
    this.cache.set(job.id, job);
  }

  async getSnapshot(jobId: string): Promise<JobSnapshot | null> {
    const job = await this.get(jobId);
    if (!job) return null;

    const confidence = Math.max(0, Math.min(1, job.progress / 100));

    return {
      id: job.id,
      userId: job.userId,
      type: job.type,
      state: job.state,
      progress: job.progress,
      step: job.step,
      lastStep: job.step,
      lastChunkIndex: 0,
      partialOutput: job.state === 'completed' ? job.result : undefined,
      confidence,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
    };
  }
}

export const jobRegistry = new JobRegistry();

export function configureJobRegistry(p: JobProvider) {
  provider = p;
}
