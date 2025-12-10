/**
 * Loading Indicator Component
 * Shows loading state for webpages with progress indication
 */

import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingIndicatorProps {
  progress?: number; // 0-100
  message?: string;
  fullPage?: boolean;
  className?: string;
}

export function LoadingIndicator({
  progress,
  message = 'Loading...',
  fullPage = false,
  className,
}: LoadingIndicatorProps) {
  if (fullPage) {
    return (
      <div
        className={cn(
          'flex min-h-full flex-col items-center justify-center bg-slate-950 p-8',
          className
        )}
      >
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-purple-400" />
        {progress !== undefined && (
          <div className="mb-4 h-1 w-64 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="text-slate-400">{message}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm',
        className
      )}
    >
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-purple-400" />
      {progress !== undefined && (
        <div className="mb-3 h-1 w-48 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
