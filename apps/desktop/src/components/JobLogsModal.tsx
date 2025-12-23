import React from 'react';
import type { JobLogEntry } from '../services/jobs';

interface JobLogsModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string;
  logs: JobLogEntry[];
  message?: string;
}

// Simple modal to display job logs or placeholder text
export const JobLogsModal: React.FC<JobLogsModalProps> = ({
  open,
  onClose,
  jobId,
  logs,
  message,
}) => {
  if (!open) return null;

  const sortedLogs = [...logs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-50 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Logs for job {jobId}</div>
            {message && <div className="text-xs text-slate-300">{message}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
          >
            Close
          </button>
        </div>

        {sortedLogs.length === 0 ? (
          <div className="rounded bg-slate-800/70 p-3 text-xs text-slate-300">
            No logs available yet.
          </div>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {sortedLogs.map((log, idx) => (
              <div key={idx} className="rounded bg-slate-800/70 p-2 text-xs">
                <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                  <span>{log.type || 'info'}</span>
                  <span>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
                </div>
                <div className="whitespace-pre-wrap break-words text-slate-100">{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobLogsModal;
