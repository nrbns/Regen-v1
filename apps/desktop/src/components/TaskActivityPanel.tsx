/**
 * Task Activity Panel
 * Shows detailed job progress with step-by-step breakdown
 */

import React, { useEffect, useState } from 'react';
import { useJobProgress } from '../hooks/useJobProgress';
import StreamingText from './StreamingText';
import RetryPanel from './RetryPanel';
import ConnectionBanner from './ConnectionBanner';
import { JobErrorBoundary } from './JobErrorBoundary';
import JobLogsModal from './JobLogsModal';
import { resumeJob, fetchJob, fetchJobLogs, reportJobIssue } from '../services/jobs';

interface Step {
  name: string;
  completed: boolean;
  inProgress: boolean;
  duration?: number;
}

interface TaskActivityPanelProps {
  jobId: string | null;
  onCancel?: () => void;
  className?: string;
}

export const TaskActivityPanel: React.FC<TaskActivityPanelProps> = ({
  jobId,
  onCancel,
  className = '',
}) => {
  const { state, cancel, isStreaming, streamingText, connection } = useJobProgress(jobId || null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkpointInfo, setCheckpointInfo] = useState<{
    available: boolean;
    sequence?: number;
    step?: string;
    progress?: number;
  }>({ available: false });
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<{ message: string; timestamp?: number; type?: string }[]>([]);
  const [logsMessage, setLogsMessage] = useState<string | undefined>(undefined);

  // Transient toast for status changes
  useEffect(() => {
    if (!state) return;
    if (state.isFailed) {
      setToast('Job failed. You can retry or view logs.');
    } else if (state.isComplete) {
      setToast('Job completed successfully.');
    }
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [state?.isFailed, state?.isComplete]);

  // Map progress to estimated steps
  useEffect(() => {
    if (!state) {
      setSteps([]);
      return;
    }

    const newSteps: Step[] = [
      {
        name: 'Parsing Input',
        completed: state.progress > 5,
        inProgress: state.progress <= 15 && state.progress > 5,
      },
      {
        name: 'Searching Sources',
        completed: state.progress > 30,
        inProgress: state.progress <= 50 && state.progress > 30,
      },
      {
        name: 'Processing Results',
        completed: state.progress > 60,
        inProgress: state.progress <= 75 && state.progress > 60,
      },
      {
        name: 'Generating Response',
        completed: state.progress > 85,
        inProgress: state.progress <= 95 && state.progress > 85,
      },
      {
        name: 'Finalizing',
        completed: state.isComplete,
        inProgress: state.progress > 95 && !state.isComplete,
      },
    ];

    setSteps(newSteps);
  }, [state]);

  // Track elapsed time
  useEffect(() => {
    if (!state || state.isComplete || state.isFailed) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state?.isComplete, state?.isFailed]);

  // Fetch checkpoint info when job transitions to failed (to inform retry)
  useEffect(() => {
    const fetchCheckpoint = async () => {
      if (!state?.jobId || !state.isFailed) return;
      try {
        const details = await fetchJob(state.jobId);
        setCheckpointInfo({
          available: Boolean(details.checkpointAvailable),
          sequence: details.checkpointSequence,
          step: details.checkpointStep,
          progress: details.checkpointProgress,
        });
      } catch (err) {
        console.warn('[TaskActivityPanel] unable to fetch checkpoint info', err);
      }
    };
    fetchCheckpoint();
  }, [state?.jobId, state?.isFailed]);

  if (!state) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      cancel();
    }
  };

  return (
    <JobErrorBoundary>
      <div
        className={`max-w-md space-y-3 rounded-lg border border-slate-700 bg-slate-800 p-4 ${className}`}
      >
        <ConnectionBanner />

        {toast && (
          <div className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200">
            {toast}
          </div>
        )}
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            {state.isFailed ? (
              <>
                <span>❌ Task Failed</span>
              </>
            ) : state.isComplete ? (
              <>
                <span>✓ Task Complete</span>
              </>
            ) : isStreaming ? (
              <>
                <span className="animate-pulse">🔄</span>
                <span>Task in Progress</span>
              </>
            ) : (
              <>
                <span>⏳ Task in Progress</span>
              </>
            )}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{formatTime(elapsedTime)}</span>
            <span
              className={`rounded border px-2 py-0.5 text-[11px] ${
                connection.isOnline && connection.socketStatus === 'connected'
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-amber-500 text-amber-200'
              }`}
            >
              {connection.isOnline
                ? connection.socketStatus === 'connected'
                  ? 'Online'
                  : connection.socketStatus === 'connecting'
                    ? `Reconnecting (${connection.retryCount})`
                    : 'Disconnected'
                : 'Offline'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 h-2 w-full rounded-full bg-slate-700">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                state.isFailed ? 'bg-red-500' : state.isComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{state.step}</span>
            <span>{state.progress}%</span>
          </div>
        </div>

        {/* Steps */}
        <div className="mb-4 space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="min-w-6 text-lg">
                {step.completed ? (
                  '✓'
                ) : step.inProgress ? (
                  <span className="animate-spin">⚙️</span>
                ) : (
                  '○'
                )}
              </span>
              <span
                className={`text-sm ${
                  step.completed
                    ? 'text-slate-400 line-through'
                    : step.inProgress
                      ? 'font-medium text-white'
                      : 'text-slate-500'
                }`}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>

        {/* Streaming Text Preview */}
        {(isStreaming || streamingText) && (
          <StreamingText text={streamingText} isStreaming={isStreaming} />
        )}

        {/* Error Message */}
        {state.isFailed && state.error && (
          <div className="mb-4 rounded border border-red-700 bg-red-900/30 p-2">
            <p className="text-xs text-red-300">{state.error}</p>
          </div>
        )}

        {/* Retry Panel */}
        {state.isFailed && (
          <RetryPanel
            jobId={state.jobId}
            errorMessage={state.error}
            hasCheckpoint={checkpointInfo.available}
            checkpointMeta={{
              sequence: checkpointInfo.sequence,
              step: checkpointInfo.step,
              progress: checkpointInfo.progress,
            }}
            busy={busy}
            onRetry={async () => {
              if (!state?.jobId) return;
              setBusy(true);
              try {
                const resp = await resumeJob(state.jobId);
                setCheckpointInfo({
                  available: Boolean(resp.checkpointAvailable),
                  sequence: resp.checkpointSequence,
                  step: resp.checkpointStep,
                  progress: resp.checkpointProgress,
                });
                setToast('Retry requested. Resuming job…');
              } catch (err: any) {
                setToast(err?.message || 'Retry failed');
              } finally {
                setBusy(false);
              }
            }}
            onViewLogs={async () => {
              if (!state?.jobId) return;
              setBusy(true);
              try {
                const details = await fetchJob(state.jobId);
                setCheckpointInfo({
                  available: Boolean(details.checkpointAvailable),
                  sequence: details.checkpointSequence,
                  step: details.checkpointStep,
                  progress: details.checkpointProgress,
                });
                const logResp = await fetchJobLogs(state.jobId);
                setLogs(logResp.logs || []);
                setLogsMessage(logResp.message);
                setLogsOpen(true);
                setToast(logResp.logs.length ? 'Loaded logs' : 'No logs available yet');
              } catch (err: any) {
                setToast(err?.message || 'Unable to fetch logs');
              } finally {
                setBusy(false);
              }
            }}
            onReport={async () => {
              if (!state?.jobId) return;
              setBusy(true);
              try {
                await reportJobIssue(state.jobId, { error: state.error });
                setToast('Issue noted. We will review.');
              } catch (err: any) {
                setToast(err?.message || 'Report failed');
              } finally {
                setBusy(false);
              }
            }}
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!state.isComplete && !state.isFailed && (
            <button
              onClick={handleCancel}
              className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              /* Close panel */
            }}
            className="rounded bg-slate-700 px-3 py-1 text-xs text-white transition-colors hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
      <JobLogsModal
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        jobId={state.jobId}
        logs={logs}
        message={logsMessage}
      />
    </JobErrorBoundary>
  );
};

export default TaskActivityPanel;
