import React from 'react';

interface RetryPanelProps {
  jobId: string;
  errorMessage?: string;
  hasCheckpoint?: boolean;
  checkpointMeta?: { sequence?: number; step?: string; progress?: number };
  onRetry?: () => void;
  onViewLogs?: () => void;
  onReport?: () => void;
  busy?: boolean;
}

// Minimal retry panel for failed jobs with action hooks
export const RetryPanel: React.FC<RetryPanelProps> = ({
  jobId,
  errorMessage,
  hasCheckpoint = false,
  checkpointMeta,
  onRetry,
  onViewLogs,
  onReport,
  busy = false,
}) => {
  return (
    <div className="space-y-2 rounded border border-red-700 bg-red-900/40 p-3 text-sm text-red-100">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Job failed</div>
        <span className="text-xs text-red-200">ID: {jobId}</span>
      </div>
      {errorMessage && <div className="text-xs text-red-200">{errorMessage}</div>}
      {hasCheckpoint && (
        <div className="flex flex-col gap-0.5 text-xs text-amber-200">
          <span>Checkpoint available — retry will resume from last save.</span>
          {checkpointMeta && (
            <span className="text-[11px] text-amber-100">
              seq {checkpointMeta.sequence ?? '–'} • {checkpointMeta.step ?? 'unknown'} @{' '}
              {checkpointMeta.progress ?? 0}%
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRetry}
          disabled={busy}
          className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:bg-red-800 disabled:opacity-70"
        >
          {busy ? 'Retrying…' : 'Retry'}
        </button>
        <button
          onClick={onViewLogs}
          disabled={busy}
          className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-70"
        >
          View logs
        </button>
        <button
          onClick={onReport}
          disabled={busy}
          className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600 disabled:opacity-70"
        >
          Report issue
        </button>
      </div>
    </div>
  );
};

export default RetryPanel;
