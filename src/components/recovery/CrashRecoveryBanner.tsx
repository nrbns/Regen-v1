/**
 * Crash Recovery Banner - Shows recovery options for crashed jobs
 *
 * Displays when crashed jobs are detected, allowing users to:
 * - Resume from last checkpoint
 * - Dismiss the recovery option
 * - View job details
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, RotateCcw, X, Clock, CheckCircle as _CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jobAuthority } from '../../core/jobAuthority';
import { toast } from '../../utils/toast';
import type { JobCheckpoint } from '../../core/jobAuthority';

interface CrashedJob {
  jobId: string;
  checkpoint: JobCheckpoint;
  timestamp: number;
}

interface CrashRecoveryBannerProps {
  onResume?: (jobId: string) => void;
  onDismiss?: (jobId: string) => void;
}

export function CrashRecoveryBanner({ onResume, onDismiss }: CrashRecoveryBannerProps) {
  const [crashedJobs, setCrashedJobs] = useState<CrashedJob[]>([]);
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check for crashed jobs on mount
    const checkCrashedJobs = async () => {
      try {
        const crashedJobIds = await jobAuthority.checkCrashedJobs();

        if (crashedJobIds.length > 0) {
          const jobs: CrashedJob[] = [];

          for (const jobId of crashedJobIds) {
            // Skip if dismissed
            if (dismissedJobs.has(jobId)) continue;

            const checkpoint = await jobAuthority.resume(jobId);
            if (checkpoint) {
              jobs.push({
                jobId,
                checkpoint,
                timestamp: checkpoint.timestamp,
              });
            }
          }

          setCrashedJobs(jobs);
        }
      } catch (error) {
        console.error('[CrashRecoveryBanner] Failed to check crashed jobs:', error);
      }
    };

    checkCrashedJobs();

    // Listen for crashed job events
    const handleCrashedJobs = (event: CustomEvent) => {
      const { jobIds: _jobIds } = event.detail;
      checkCrashedJobs();
    };

    window.addEventListener('jobAuthority:crashed', handleCrashedJobs as EventListener);

    return () => {
      window.removeEventListener('jobAuthority:crashed', handleCrashedJobs as EventListener);
    };
  }, [dismissedJobs]);

  const handleResume = async (jobId: string) => {
    try {
      const checkpoint = await jobAuthority.resume(jobId);
      if (checkpoint) {
        toast.success(`Resuming job from ${checkpoint.progress}%`);

        // Emit event for job resumption
        window.dispatchEvent(
          new CustomEvent('job:recovered', {
            detail: { jobId, action: 'resumed' },
          })
        );

        if (onResume) {
          onResume(jobId);
        }

        // Remove from crashed jobs list
        setCrashedJobs(prev => prev.filter(j => j.jobId !== jobId));
      }
    } catch (error) {
      console.error('[CrashRecoveryBanner] Failed to resume job:', error);
      toast.error('Failed to resume job');
    }
  };

  const handleDismiss = (jobId: string) => {
    setDismissedJobs(prev => new Set(prev).add(jobId));
    setCrashedJobs(prev => prev.filter(j => j.jobId !== jobId));

    if (onDismiss) {
      onDismiss(jobId);
    }
  };

  if (crashedJobs.length === 0) {
    return null;
  }

  // Show most recent crashed job
  const mostRecentJob = crashedJobs.sort((a, b) => b.timestamp - a.timestamp)[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed left-0 right-0 top-0 z-[200] bg-amber-600 px-4 py-3 text-white shadow-lg"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          {/* Left: Alert Icon + Message */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">Job Interrupted</div>
              <div className="text-sm opacity-90">
                Job {mostRecentJob.jobId.slice(0, 8)}... was interrupted at{' '}
                {mostRecentJob.checkpoint.progress}% - {mostRecentJob.checkpoint.step}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="tabular-nums">{mostRecentJob.checkpoint.progress}%</span>
            </div>

            {/* Resume Button */}
            <button
              onClick={() => handleResume(mostRecentJob.jobId)}
              className="inline-flex items-center gap-2 rounded bg-white/20 px-3 py-1.5 text-sm font-medium transition hover:bg-white/30"
            >
              <RotateCcw className="h-4 w-4" />
              Resume
            </button>

            {/* Dismiss Button */}
            <button
              onClick={() => handleDismiss(mostRecentJob.jobId)}
              className="inline-flex items-center rounded bg-white/20 p-1.5 transition hover:bg-white/30"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Show count if multiple crashed jobs */}
        {crashedJobs.length > 1 && (
          <div className="mx-auto mt-2 max-w-7xl text-xs opacity-75">
            +{crashedJobs.length - 1} more interrupted job{crashedJobs.length - 1 !== 1 ? 's' : ''}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Crash Recovery Panel - Expanded view with all crashed jobs
 */
export function CrashRecoveryPanel({ onResume, onDismiss }: CrashRecoveryBannerProps) {
  const [crashedJobs, setCrashedJobs] = useState<CrashedJob[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleResume = async (jobId: string) => {
    try {
      const checkpoint = await jobAuthority.resume(jobId);
      if (checkpoint) {
        toast.success(`Resuming job from ${checkpoint.progress}%`);

        window.dispatchEvent(
          new CustomEvent('job:recovered', {
            detail: { jobId, action: 'resumed' },
          })
        );

        if (onResume) {
          onResume(jobId);
        }

        setCrashedJobs(prev => {
          const filtered = prev.filter(j => j.jobId !== jobId);
          if (filtered.length === 0) {
            setIsOpen(false);
          }
          return filtered;
        });
      }
    } catch (error) {
      console.error('[CrashRecoveryPanel] Failed to resume job:', error);
      toast.error('Failed to resume job');
    }
  };

  useEffect(() => {
    const checkCrashedJobs = async () => {
      try {
        const crashedJobIds = await jobAuthority.checkCrashedJobs();

        if (crashedJobIds.length > 0) {
          const jobs: CrashedJob[] = [];

          for (const jobId of crashedJobIds) {
            const checkpoint = await jobAuthority.resume(jobId);
            if (checkpoint) {
              jobs.push({
                jobId,
                checkpoint,
                timestamp: checkpoint.timestamp,
              });
            }
          }

          setCrashedJobs(jobs);
          setIsOpen(jobs.length > 0);
        }
      } catch (error) {
        console.error('[CrashRecoveryPanel] Failed to check crashed jobs:', error);
      }
    };

    checkCrashedJobs();

    const handleCrashedJobs = () => {
      checkCrashedJobs();
    };

    window.addEventListener('jobAuthority:crashed', handleCrashedJobs as EventListener);

    return () => {
      window.removeEventListener('jobAuthority:crashed', handleCrashedJobs as EventListener);
    };
  }, []);

  if (!isOpen || crashedJobs.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-4 top-20 z-[190] max-w-md rounded-lg border border-amber-500/50 bg-slate-900 shadow-xl"
    >
      <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white">Interrupted Jobs ({crashedJobs.length})</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto p-4">
        <div className="space-y-3">
          {crashedJobs.map(job => (
            <div key={job.jobId} className="rounded border border-slate-700 bg-slate-800/50 p-3">
              <div className="mb-2 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs text-slate-400">
                    {job.jobId.slice(0, 16)}...
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{job.checkpoint.step}</div>
                </div>
                <div className="ml-2 flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  {job.checkpoint.progress}%
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => handleResume(job.jobId)}
                  className="flex-1 rounded bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/30"
                >
                  <RotateCcw className="mr-1 inline h-3 w-3" />
                  Resume
                </button>
                <button
                  onClick={() => {
                    if (onDismiss) onDismiss(job.jobId);
                    setCrashedJobs(prev => prev.filter(j => j.jobId !== job.jobId));
                  }}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-600"
                >
                  Dismiss
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-2">
                <div className="h-1 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${job.checkpoint.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
