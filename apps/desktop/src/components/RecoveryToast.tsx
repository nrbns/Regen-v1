import React from 'react';
import type { RecoveryNotification } from '../hooks/useRecoveryNotifications';

interface RecoveryToastProps {
  notification: RecoveryNotification;
  onResume?: (jobId: string) => void;
  onDismiss?: () => void;
}

const RecoveryToast: React.FC<RecoveryToastProps> = ({ notification, onResume, onDismiss }) => {
  const { type, jobId, progress, step, reason } = notification;

  const title = type === 'paused' ? 'Job Paused' : 'Job Failed';
  const detail =
    type === 'paused'
      ? `Click resume to continue from checkpoint${
          typeof progress === 'number' ? ` (${progress}%)` : ''
        }.`
      : reason || 'Job encountered an error.';

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <button
          onClick={onDismiss}
          className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-800"
        >
          Close
        </button>
      </div>
      {step && <p className="text-xs text-slate-300">Last step: {step}</p>}
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
      <div className="mt-3 flex justify-end gap-2">
        {type === 'paused' && (
          <button
            onClick={() => onResume?.(jobId)}
            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
          >
            Resume
          </button>
        )}
        <button
          onClick={onDismiss}
          className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default RecoveryToast;
