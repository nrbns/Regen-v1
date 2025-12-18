import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Play, Pause, CheckCircle, AlertCircle, Trash2, RotateCcw } from 'lucide-react';
import { getSocketClient } from '../../services/realtime/socketClient';

interface TimelineJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  streamingOutput: string;
  startTime: number;
  endTime?: number;
  error?: string;
  step?: string;
}

/**
 * Job Timeline Panel - Shows running and completed jobs
 * Features:
 * - Always shows most recent job
 * - Auto-expands on new job start
 * - Shows progress bar + streaming output
 * - Resume button for paused jobs
 * - Collapse after 5s on completion
 * - Stores in sessionStorage for persistence
 */
export function JobTimelinePanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [jobs, setJobs] = useState<TimelineJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionStorageKey = 'job-timeline-state';

  // Load jobs from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(sessionStorageKey);
      if (stored) {
        const { jobs: storedJobs, activeJobId: storedActiveId } = JSON.parse(stored);
        setJobs(storedJobs || []);
        setActiveJobId(storedActiveId);
      }
    } catch {
      // Silently fail, sessionStorage is optional
    }
  }, []);

  // Save jobs to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(sessionStorageKey, JSON.stringify({ jobs, activeJobId }));
    } catch {
      // Silently fail
    }
  }, [jobs, activeJobId]);

  // Subscribe to socket events
  useEffect(() => {
    const client = getSocketClient();
    if (!client) return;

    const unsubscribers: (() => void)[] = [];

    // Listen for job start
    const unsubJobStart = client.on?.('job:start', (data: any) => {
      const newJob: TimelineJob = {
        jobId: data.jobId,
        status: 'running',
        progress: 0,
        streamingOutput: '',
        startTime: Date.now(),
        step: data.step || 'Initializing',
      };
      setJobs((prev) => [newJob, ...prev]);
      setActiveJobId(data.jobId);
      setIsExpanded(true);
    });
    if (unsubJobStart) unsubscribers.push(unsubJobStart);

    // Listen for job progress
    const unsubJobProgress = client.on?.('job:progress', (data: any) => {
      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: data.progress || 0,
                step: data.step || job.step,
              }
            : job
        )
      );
    });
    if (unsubJobProgress) unsubscribers.push(unsubJobProgress);

    // Listen for streaming chunks
    const unsubModelChunk = client.on?.('model:chunk', (data: any) => {
      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === data.jobId
            ? {
                ...job,
                streamingOutput: job.streamingOutput + (data.chunk || ''),
              }
            : job
        )
      );
    });
    if (unsubModelChunk) unsubscribers.push(unsubModelChunk);

    // Listen for job completion
    const unsubJobComplete = client.on?.('job:completed', (data: any) => {
      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === data.jobId
            ? {
                ...job,
                status: 'completed',
                endTime: Date.now(),
                progress: 100,
              }
            : job
        )
      );

      // Auto-collapse after 5s
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 5000);
    });
    if (unsubJobComplete) unsubscribers.push(unsubJobComplete);

    // Listen for job failure
    const unsubJobFailed = client.on?.('job:failed', (data: any) => {
      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === data.jobId
            ? {
                ...job,
                status: 'failed',
                endTime: Date.now(),
                error: data.error || 'Job failed',
              }
            : job
        )
      );
    });
    if (unsubJobFailed) unsubscribers.push(unsubJobFailed);

    // Cleanup
    return () => {
      unsubscribers.forEach((unsub) => unsub?.());
    };
  }, []);

  if (jobs.length === 0) {
    return null;
  }

  const currentJob = jobs[0];
  const isCurrentRunning = currentJob.status === 'running';
  const elapsedMs = currentJob.endTime
    ? currentJob.endTime - currentJob.startTime
    : Date.now() - currentJob.startTime;
  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500/20 text-blue-400';
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-md">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getStatusIcon(currentJob.status)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">
                Job {currentJob.jobId.slice(0, 8)}
              </div>
              {currentJob.step && (
                <div className="text-xs text-slate-400">{currentJob.step}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{elapsedSec}s</span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Progress Bar */}
        {isCurrentRunning && (
          <div className="px-4 py-2 bg-slate-800/50">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-xs text-slate-400">{currentJob.progress}%</span>
            </div>
            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${currentJob.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-slate-700 bg-slate-800/30 max-h-96 overflow-y-auto">
            {/* Current Job Details */}
            <div className="p-4 border-b border-slate-700">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(currentJob.status)}`}>
                    {currentJob.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Job ID</span>
                  <span className="text-xs text-slate-300 font-mono">{currentJob.jobId}</span>
                </div>
                {currentJob.error && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Error</span>
                    <span className="text-xs text-red-400">{currentJob.error}</span>
                  </div>
                )}
              </div>

              {/* Streaming Output */}
              {currentJob.streamingOutput && (
                <div className="mb-4">
                  <div className="text-xs text-slate-500 mb-2">Output</div>
                  <div className="bg-slate-900 rounded p-2 text-xs text-slate-300 font-mono max-h-48 overflow-y-auto break-words whitespace-pre-wrap">
                    {currentJob.streamingOutput.slice(0, 500)}
                    {currentJob.streamingOutput.length > 500 && '...'}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isCurrentRunning && (
                  <button className="flex-1 px-3 py-2 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 transition flex items-center justify-center gap-1">
                    <Pause className="w-3 h-3" />
                    Pause
                  </button>
                )}
                {currentJob.status === 'paused' && (
                  <button className="flex-1 px-3 py-2 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Resume
                  </button>
                )}
                {currentJob.status === 'failed' && (
                  <button className="flex-1 px-3 py-2 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Previous Jobs */}
            {jobs.length > 1 && (
              <div>
                <div className="px-4 py-2 text-xs text-slate-500 font-medium bg-slate-900/50">
                  Recent Jobs ({jobs.length - 1})
                </div>
                <div className="divide-y divide-slate-700/50">
                  {jobs.slice(1, 6).map((job) => (
                    <div key={job.jobId} className="px-4 py-2 hover:bg-slate-700/20 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(job.status)}
                          <div className="min-w-0">
                            <div className="text-xs text-slate-300 truncate">
                              {job.jobId.slice(0, 8)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {((job.endTime || Date.now()) - job.startTime) / 1000}s
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear History */}
            {jobs.length > 1 && (
              <button
                onClick={() => setJobs([currentJob])}
                className="w-full px-4 py-2 text-xs text-slate-400 hover:text-slate-200 border-t border-slate-700 flex items-center justify-center gap-2 transition"
              >
                <Trash2 className="w-3 h-3" />
                Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resume Banner (if job paused or failed) */}
      {(currentJob.status === 'paused' || currentJob.status === 'failed') && !isExpanded && (
        <div className="mt-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Job {currentJob.status}</span>
        </div>
      )}
    </div>
  );
}
