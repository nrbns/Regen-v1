import React from 'react';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onResume?: () => void;
  onRestart?: () => void;
  onDismiss?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title = 'Job Failed',
  message,
  onResume,
  onRestart,
  onDismiss,
}) => {
  return (
    <div className="fixed left-1/2 top-4 z-40 w-[600px] -translate-x-1/2 rounded-lg border border-red-700 bg-red-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-red-200">{title}</h4>
        <button
          onClick={onDismiss}
          className="rounded px-2 py-0.5 text-xs text-red-200 hover:bg-red-800/50"
        >
          Close
        </button>
      </div>
      <p className="text-xs text-red-200/90">{message}</p>
      <div className="mt-3 flex justify-end gap-2">
        {onResume && (
          <button
            onClick={onResume}
            className="rounded bg-blue-700 px-3 py-1 text-xs text-white hover:bg-blue-800"
          >
            Resume from checkpoint
          </button>
        )}
        {onRestart && (
          <button
            onClick={onRestart}
            className="rounded bg-amber-700 px-3 py-1 text-xs text-white hover:bg-amber-800"
          >
            Restart
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorBanner;
