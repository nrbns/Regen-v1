import { useEffect, useState, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Trash2,
  RotateCcw,
  Brain,
} from 'lucide-react';
import { eventBus as _eventBus } from '../../core/state/eventBus';
import { getApiBaseUrl } from '../../lib/env';
import { StepProgress, StepBadge, parseJobStep, type JobStep } from './StepProgress';
import { ActionLog } from './ActionLog';
import { useActionLogFromLedger } from '../../hooks/useActionLogFromLedger';

interface TimelineJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  streamingOutput: string;
  startTime: number;
  endTime?: number;
  error?: string;
  step?: string;
  currentStep?: JobStep;
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
export function JobTimelinePanel({ onStepSelect }: { onStepSelect?: (step: JobStep) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const jobsRef = useRef<TimelineJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout>();
  const [, _forceUpdate] = useState(0);
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
      jobsRef.current = storedJobs || [];
    } catch {
      // Silently fail
    }
  }, [jobs, activeJobId]);

  // Subscribe to socket events
  useEffect(() => {
    let client: ReturnType<typeof getSocketClient> | null = null;
    let _isMounted = true;
    const unsubscribers: (() => void)[] = [];
    sessionStorage.setItem(
      sessionStorageKey,
      JSON.stringify({ jobs: jobsRef.current, activeJobId })
    );
    // Initialize socket client if not already initialized
    const initializeAndSubscribe = async () => {
      try {
        // Try to get existing client first
        try {
          client = getSocketClient();
        } catch {
          // Client not initialized, initialize it
          // Socket.IO uses HTTP/HTTPS URLs, not WebSocket URLs
          const socketUrl =
            (import.meta as any).env?.VITE_SOCKET_URL || getApiBaseUrl() || 'http://localhost:4000';
          client = await initSocketClient({
            url: socketUrl,
            token: null,
            deviceId: `web-${Date.now()}`,
          });
        }

        jobsRef.current = [newJob, ...jobsRef.current];

        // Listen for job start
        const unsubJobStart = client.on?.('job:start', (data: any) => {
          const stepString = data.step || 'Initializing';
          const newJob: TimelineJob = {
            jobId: data.jobId,
            status: 'running',
            progress: 0,
            streamingOutput: '',
            startTime: Date.now(),
            step: stepString,
            currentStep: parseJobStep(stepString),
          };
          setJobs(prev => [newJob, ...prev]);
          setActiveJobId(data.jobId);
          setIsExpanded(true);
        });
        if (unsubJobStart) unsubscribers.push(unsubJobStart);

        // Listen for job progress
        const unsubJobProgress = client.on?.('job:progress', (data: any) => {
          setJobs(prev =>
            prev.map(job =>
              job.jobId === data.jobId
                ? {
                    ...job,
                    progress: data.progress || 0,
                    step: data.step || job.step,
                    currentStep: parseJobStep(data.step || job.step),
                  }
                : job
            )
          );
        });
        if (unsubJobProgress) unsubscribers.push(unsubJobProgress);

        // Listen for streaming chunks
        const unsubModelChunk = client.on?.('model:chunk', (data: any) => {
          setJobs(prev =>
            prev.map(job =>
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
          setJobs(prev =>
            prev.map(job =>
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
          setJobs(prev =>
            prev.map(job =>
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
      } catch (error) {
        console.warn('[JobTimelinePanel] Failed to initialize socket client:', error);
        // Silently fail - socket client is optional
      }
    };

    initializeAndSubscribe();

    // Cleanup
    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => unsub?.());
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

  // Fetch ActionLog entries from Event Ledger (with mandatory confidence + sources)
  const { entries: actionLogEntries } = useActionLogFromLedger(currentJob.jobId);

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
        return <Play className="h-4 w-4 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-lg">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-slate-800/50"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {getStatusIcon(currentJob.status)}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-200">
                Job {currentJob.jobId.slice(0, 8)}
              </div>
              {currentJob.currentStep && currentJob.currentStep !== 'idle' ? (
                <div className="mt-1">
                  <StepBadge currentStep={currentJob.currentStep} />
                </div>
              ) : currentJob.step ? (
                <div className="text-xs text-slate-400">{currentJob.step}</div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{elapsedSec}s</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Progress Bar */}
        {isCurrentRunning && (
          <div className="bg-slate-800/50 px-4 py-2">
            <div className="mb-1 flex justify-between">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-xs text-slate-400">{currentJob.progress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${currentJob.progress}%` }}
              />
            </div>

            {/* Step Progress Indicator */}
            {currentJob.currentStep && currentJob.currentStep !== 'idle' && (
              <div
                className="mt-3 cursor-pointer"
                onClick={() => onStepSelect?.(currentJob.currentStep!)}
              >
                <StepProgress currentStep={currentJob.currentStep} size="sm" />
              </div>
            )}
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto border-t border-slate-700 bg-slate-800/30">
            {/* Current Job Details */}
            <div className="border-b border-slate-700 p-4">
              <div className="mb-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <span
                    className={`rounded px-2 py-1 text-xs ${getStatusColor(currentJob.status)}`}
                  >
                    {currentJob.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Job ID</span>
                  <span className="font-mono text-xs text-slate-300">{currentJob.jobId}</span>
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
                  <div className="mb-2 text-xs text-slate-500">Output</div>
                  <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded bg-slate-900 p-2 font-mono text-xs text-slate-300">
                    {currentJob.streamingOutput.slice(0, 500)}
                    {currentJob.streamingOutput.length > 500 && '...'}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isCurrentRunning && (
                  <button className="flex flex-1 items-center justify-center gap-1 rounded bg-yellow-500/20 px-3 py-2 text-xs text-yellow-400 transition hover:bg-yellow-500/30">
                    <Pause className="h-3 w-3" />
                    Pause
                  </button>
                )}
                {currentJob.status === 'paused' && (
                  <button className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-500/20 px-3 py-2 text-xs text-blue-400 transition hover:bg-blue-500/30">
                    <RotateCcw className="h-3 w-3" />
                    Resume
                  </button>
                )}
                {currentJob.status === 'failed' && (
                  <button className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-500/20 px-3 py-2 text-xs text-blue-400 transition hover:bg-blue-500/30">
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Intelligence Visibility - Show AI Reasoning */}
            <div className="space-y-4 border-t border-slate-700 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Brain className="h-4 w-4 text-blue-400" />
                How Regen Thinks
              </div>

              {/* ActionLog - What Regen understood (from Event Ledger) */}
              <ActionLog
                entries={
                  actionLogEntries.length > 0
                    ? actionLogEntries
                    : [
                        // Fallback if no ledger entries yet
                        {
                          id: `job-${currentJob.jobId}-action`,
                          timestamp: Date.now(),
                          userSaid: currentJob.step || 'Running...',
                          regenUnderstood: {
                            intent: currentJob.step || 'Processing',
                            confidence: currentJob.progress / 100,
                          },
                          decision: {
                            action: currentJob.status,
                            reasoning: `Job is currently ${currentJob.status}. Progress: ${currentJob.progress}%`,
                            constraints: [],
                          },
                          context: {
                            sources: ['user-input'],
                            mode: 'research',
                          },
                          result: currentJob.status === 'completed' ? { success: true } : undefined,
                        },
                      ]
                }
              />
            </div>

            {/* Previous Jobs */}
            {jobs.length > 1 && (
              <div>
                <div className="bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-500">
                  Recent Jobs ({jobs.length - 1})
                </div>
                <div className="divide-y divide-slate-700/50">
                  {jobs.slice(1, 6).map(job => (
                    <div key={job.jobId} className="px-4 py-2 transition hover:bg-slate-700/20">
                      <div className="flex items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {getStatusIcon(job.status)}
                          <div className="min-w-0">
                            <div className="truncate text-xs text-slate-300">
                              {job.jobId.slice(0, 8)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {((job.endTime || Date.now()) - job.startTime) / 1000}s
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${getStatusColor(job.status)}`}
                        >
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
                className="flex w-full items-center justify-center gap-2 border-t border-slate-700 px-4 py-2 text-xs text-slate-400 transition hover:text-slate-200"
              >
                <Trash2 className="h-3 w-3" />
                Clear History
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resume Banner (if job paused or failed) */}
      {(currentJob.status === 'paused' || currentJob.status === 'failed') && !isExpanded && (
        <div className="mt-2 flex items-center gap-2 rounded border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Job {currentJob.status}</span>
        </div>
      )}
    </div>
  );
}
