/**
 * Hook to monitor global job status
 * Provides real-time job state for Global Status Bar
 */

import { useEffect, useState } from 'react';

export interface GlobalJobStatus {
  activeJobs: Array<{
    id: string;
    state: 'running' | 'paused' | 'completed' | 'failed';
    progress: number;
    step: string;
  }>;
  totalProgress: number;
  overallStatus: 'idle' | 'running' | 'paused';
}

export function useGlobalJobStatus(): GlobalJobStatus {
  const [jobs, setJobs] = useState<GlobalJobStatus['activeJobs']>([]);

  useEffect(() => {
    // Listen for job events to update state
    const handleJobProgress = (event: CustomEvent) => {
      const { jobId, state, progress, step } = event.detail;
      setJobs(prev => {
        const existing = prev.find(j => j.id === jobId);

        // Remove completed/failed/cancelled jobs
        if (state === 'completed' || state === 'failed' || state === 'cancelled') {
          return prev.filter(j => j.id !== jobId);
        }

        // Update existing job
        if (existing) {
          return prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  state: state as 'running' | 'paused',
                  progress: progress || 0,
                  step: step || '',
                }
              : j
          );
        }

        // Add new job (only running or paused)
        if (state === 'running' || state === 'paused') {
          return [
            ...prev,
            {
              id: jobId,
              state: state as 'running' | 'paused',
              progress: progress || 0,
              step: step || '',
            },
          ];
        }

        return prev;
      });
    };

    const handleJobStateChanged = (event: CustomEvent) => {
      handleJobProgress(event);
    };

    window.addEventListener('job:progress', handleJobProgress as EventListener);
    window.addEventListener('job:state-changed', handleJobStateChanged as EventListener);

    return () => {
      window.removeEventListener('job:progress', handleJobProgress as EventListener);
      window.removeEventListener('job:state-changed', handleJobStateChanged as EventListener);
    };
  }, []);

  const totalProgress =
    jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length) : 0;

  const overallStatus =
    jobs.length === 0 ? 'idle' : jobs.some(j => j.state === 'running') ? 'running' : 'paused';

  return {
    activeJobs: jobs,
    totalProgress,
    overallStatus,
  };
}
