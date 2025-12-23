/**
 * Global Job Timeline - Always Accessible Job View
 *
 * Floating drawer that shows all active jobs across all modes.
 * Accessible via keyboard shortcut (Cmd/Ctrl + J) and always visible when jobs are running.
 *
 * Unlike mode-specific panels, this is global and persistent.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGlobalJobStatus } from '../../hooks/useGlobalJobStatus';

interface JobDetail {
  id: string;
  type: string;
  query?: string;
  state: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  step: string;
  startedAt?: number;
  error?: string;
}

export function GlobalJobTimeline() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const { activeJobs } = useGlobalJobStatus();

  // Update jobs from hook
  useEffect(() => {
    setJobs(
      activeJobs.map(j => ({
        id: j.id,
        type: 'unknown',
        state: j.state,
        progress: j.progress,
        step: j.step,
      }))
    );
  }, [activeJobs]);

  // Auto-open when jobs start
  useEffect(() => {
    if (activeJobs.length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [activeJobs.length, isOpen]);

  // Listen for toggle event (from status bar)
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    window.addEventListener('job-timeline:toggle', handleToggle);
    return () => window.removeEventListener('job-timeline:toggle', handleToggle);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Job actions
  const handleResume = useCallback(async (jobId: string) => {
    try {
      // Dispatch resume event
      window.dispatchEvent(
        new CustomEvent('job:action', {
          detail: { jobId, action: 'resume' },
        })
      );
    } catch (error) {
      console.error('[GlobalJobTimeline] Resume failed:', error);
    }
  }, []);

  const handlePause = useCallback(async (jobId: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent('job:action', {
          detail: { jobId, action: 'pause' },
        })
      );
    } catch (error) {
      console.error('[GlobalJobTimeline] Pause failed:', error);
    }
  }, []);

  const handleRestart = useCallback(async (jobId: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent('job:action', {
          detail: { jobId, action: 'restart' },
        })
      );
    } catch (error) {
      console.error('[GlobalJobTimeline] Restart failed:', error);
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-16 right-4 z-[150] w-96 rounded-lg border border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Active Jobs</h3>
          {jobs.length > 0 && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {jobs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 transition-colors hover:text-slate-200"
            aria-label={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 transition-colors hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-slate-500" />
              <p>No active jobs</p>
              <p className="mt-1 text-xs text-slate-500">Press Cmd/Ctrl + J to open this panel</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {jobs.map(job => (
                <div key={job.id} className="p-4 transition-colors hover:bg-slate-800/50">
                  {/* Job Header */}
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {job.state === 'running' ? (
                          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-400" />
                        ) : job.state === 'paused' ? (
                          <Pause className="h-4 w-4 flex-shrink-0 text-amber-400" />
                        ) : job.state === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                        )}
                        <span className="truncate text-sm font-medium text-slate-200">
                          {job.query || job.type || 'Job'}
                        </span>
                      </div>
                      {job.step && (
                        <p className="ml-6 truncate text-xs text-slate-400">{job.step}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {job.state === 'running' && (
                    <div className="mb-3 ml-6">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs text-slate-400">Progress</span>
                        <span className="text-xs tabular-nums text-slate-400">{job.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                        <motion.div
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${job.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="ml-6 flex items-center gap-2">
                    {job.state === 'running' && (
                      <button
                        onClick={() => handlePause(job.id)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-amber-400 transition-colors hover:bg-slate-800 hover:text-amber-300"
                      >
                        <Pause className="h-3 w-3" />
                        Pause
                      </button>
                    )}
                    {job.state === 'paused' && (
                      <>
                        <button
                          onClick={() => handleResume(job.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-400 transition-colors hover:bg-slate-800 hover:text-emerald-300"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </button>
                        <button
                          onClick={() => handleRestart(job.id)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-slate-800 hover:text-blue-300"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Restart
                        </button>
                      </>
                    )}
                    {job.state === 'failed' && (
                      <button
                        onClick={() => handleRestart(job.id)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-slate-800 hover:text-blue-300"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </button>
                    )}
                    {job.error && (
                      <span className="flex-1 truncate text-xs text-rose-400" title={job.error}>
                        {job.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
