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
          'flex flex-col items-center justify-center min-h-full p-8 bg-slate-950',
          className
        )}
      >
        <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-4" />
        {progress !== undefined && (
          <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-4">
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
        'absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10',
        className
      )}
    >
      <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-3" />
      {progress !== undefined && (
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mb-3">
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


