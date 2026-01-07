/**
 * Agent Batch Manager
 * Queue and execute multiple research goals with progress tracking
 */

import { create } from 'zustand';
import { log } from '../../utils/logger';

export interface BatchTask {
  id: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
}

export interface BatchJob {
  id: string;
  name: string;
  createdAt: number;
  tasks: BatchTask[];
  status: 'idle' | 'running' | 'completed' | 'paused';
  progress: number; // 0-100
  startedAt?: number;
  completedAt?: number;
  totalDuration?: number;
}

interface BatchState {
  jobs: BatchJob[];
  currentJobId: string | null;
  createJob: (name: string) => string;
  addTaskToJob: (jobId: string, goal: string) => string;
  removeTaskFromJob: (jobId: string, taskId: string) => void;
  startJob: (jobId: string) => void;
  pauseJob: (jobId: string) => void;
  updateTaskStatus: (
    jobId: string,
    taskId: string,
    status: BatchTask['status'],
    result?: unknown,
    error?: string
  ) => void;
  getJob: (jobId: string) => BatchJob | undefined;
  deleteJob: (jobId: string) => void;
  getJobProgress: (jobId: string) => number;
  getAllJobs: () => BatchJob[];
}

export const useBatchStore = create<BatchState>((set, get) => ({
  jobs: [],
  currentJobId: null,

  createJob: (name: string) => {
    const jobId = `batch-${Date.now()}`;
    const newJob: BatchJob = {
      id: jobId,
      name,
      createdAt: Date.now(),
      tasks: [],
      status: 'idle',
      progress: 0,
    };
    set(state => ({
      jobs: [...state.jobs, newJob],
      currentJobId: jobId,
    }));
    log.info(`[BatchManager] Created job: ${name}`);
    return jobId;
  },

  addTaskToJob: (jobId: string, goal: string) => {
    const taskId = `task-${Date.now()}-${Math.random()}`;
    set(state => ({
      jobs: state.jobs.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            tasks: [
              ...job.tasks,
              {
                id: taskId,
                goal,
                status: 'pending' as const,
              },
            ],
          };
        }
        return job;
      }),
    }));
    log.info(`[BatchManager] Added task to job ${jobId}`);
    return taskId;
  },

  removeTaskFromJob: (jobId: string, taskId: string) => {
    set(state => ({
      jobs: state.jobs.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            tasks: job.tasks.filter(t => t.id !== taskId),
          };
        }
        return job;
      }),
    }));
  },

  startJob: (jobId: string) => {
    set(state => ({
      jobs: state.jobs.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            status: 'running' as const,
            startedAt: Date.now(),
          };
        }
        return job;
      }),
    }));
    log.info(`[BatchManager] Started job: ${jobId}`);
  },

  pauseJob: (jobId: string) => {
    set(state => ({
      jobs: state.jobs.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            status: 'paused' as const,
          };
        }
        return job;
      }),
    }));
  },

  updateTaskStatus: (jobId: string, taskId: string, status, result?, error?) => {
    set(state => ({
      jobs: state.jobs.map(job => {
        if (job.id === jobId) {
          const updatedTasks = job.tasks.map(task => {
            if (task.id === taskId) {
              const now = Date.now();
              return {
                ...task,
                status,
                result,
                error,
                completedAt: status === 'completed' || status === 'failed' ? now : task.completedAt,
                duration:
                  status === 'completed' || status === 'failed'
                    ? now - (task.startedAt || now)
                    : task.duration,
                startedAt: task.status === 'pending' && status === 'running' ? now : task.startedAt,
              };
            }
            return task;
          });

          // Calculate progress
          const completed = updatedTasks.filter(
            t => t.status === 'completed' || t.status === 'failed'
          ).length;
          const progress = Math.round((completed / updatedTasks.length) * 100) || 0;

          // Check if all done
          const allDone = updatedTasks.every(t => t.status === 'completed' || t.status === 'failed');
          const now = Date.now();

          return {
            ...job,
            tasks: updatedTasks,
            progress,
            status: allDone ? ('completed' as const) : job.status,
            completedAt: allDone ? now : job.completedAt,
            totalDuration: allDone ? now - (job.startedAt || now) : job.totalDuration,
          };
        }
        return job;
      }),
    }));
  },

  getJob: (jobId: string) => {
    return get().jobs.find(j => j.id === jobId);
  },

  deleteJob: (jobId: string) => {
    set(state => ({
      jobs: state.jobs.filter(j => j.id !== jobId),
      currentJobId: state.currentJobId === jobId ? null : state.currentJobId,
    }));
  },

  getJobProgress: (jobId: string) => {
    const job = get().jobs.find(j => j.id === jobId);
    return job?.progress || 0;
  },

  getAllJobs: () => {
    return get().jobs;
  },
}));

export async function executeBatchJob(jobId: string, executor: (goal: string) => Promise<any>) {
  const store = useBatchStore.getState();
  const job = store.getJob(jobId);

  if (!job) {
    log.error(`[BatchManager] Job not found: ${jobId}`);
    return;
  }

  store.startJob(jobId);

  // Execute tasks in parallel with concurrency control (max 3 concurrent)
  const concurrency = 3;
  const tasks = job.tasks.filter(t => t.status === 'pending');
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    // Update status to running
    store.updateTaskStatus(jobId, task.id, 'running');

    const promise = executor(task.goal)
      .then(result => {
        store.updateTaskStatus(jobId, task.id, 'completed', result);
        log.info(`[BatchManager] Task completed: ${task.id}`);
      })
      .catch(error => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        store.updateTaskStatus(jobId, task.id, 'failed', undefined, errorMsg);
        log.error(`[BatchManager] Task failed: ${task.id} - ${errorMsg}`);
      })
      .finally(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    // Wait if we have too many concurrent tasks
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  // Wait for remaining tasks
  await Promise.all(executing);
  log.info(`[BatchManager] Batch job completed: ${jobId}`);
}
