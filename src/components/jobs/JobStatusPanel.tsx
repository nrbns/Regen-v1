/**
 * GOAL:
 * Build a trust-focused job status panel for AI tasks.
 *
 * FEATURES:
 * - Show job status (running, paused, offline, failed)
 * - Progress bar
 * - Streaming text preview
 * - Cancel & Retry buttons
 * - Source badge (Offline / Online)
 * - Clear human-readable error messages
 *
 * UX:
 * - Never show raw stack traces
 * - Always explain what is happening
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, XCircle, WifiOff, Wifi } from 'lucide-react';
import { getSocketService } from '../../services/realtimeSocket';

interface JobStatusPanelProps {
  jobId: string;
  onClose?: () => void;
  onRetry?: () => void;
}

interface JobStatus {
  state: 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    current: number;
    total: number;
    percentage: number;
    message?: string;
  };
  chunks: string[];
  error?: string;
  result?: any;
  isOnline: boolean;
  lastCheckpoint?: { sequence: number; partialOutput: any } | null;
}

export function JobStatusPanel({ jobId, onClose, onRetry }: JobStatusPanelProps) {
  const [status, setStatus] = useState<JobStatus>({
    state: 'running',
    chunks: [],
    isOnline: true,
  });

  useEffect(() => {
    const socketService = getSocketService();

    // Subscribe to job events
    socketService.subscribeToJob(jobId);

    // Connection status
    const unsubStatus = socketService.onStatusChange(connectionStatus => {
      setStatus(prev => ({
        ...prev,
        isOnline: connectionStatus === 'online',
      }));
    });

    // Job chunk handler
    const unsubChunk = socketService.onJobChunk(jobId, data => {
      setStatus(prev => ({
        ...prev,
        chunks: [...prev.chunks, data.payload.chunk],
      }));
    });

    // Job progress handler
    const unsubProgress = socketService.onJobProgress(jobId, data => {
      setStatus(prev => ({
        ...prev,
        progress: data.payload.progress,
      }));
    });

    const unsubCheckpoint = socketService.onJobCheckpoint(jobId, data => {
      setStatus(prev => ({
        ...prev,
        lastCheckpoint: {
          sequence: data.sequence,
          partialOutput: data.payload.checkpoint?.partialOutput,
        },
      }));
    });

    // Job completion handler
    const unsubComplete = socketService.onJobComplete(jobId, data => {
      setStatus(prev => ({
        ...prev,
        state: 'completed',
        result: data.payload.result,
      }));
    });

    // Job failure handler
    const unsubFail = socketService.onJobFail(jobId, data => {
      setStatus(prev => ({
        ...prev,
        state: 'failed',
        error: data.payload.error || 'Job failed unexpectedly',
        chunks: data.payload.partialOutput || prev.chunks,
      }));
    });

    // Cleanup
    return () => {
      unsubStatus();
      unsubChunk();
      unsubProgress();
      unsubCheckpoint();
      unsubComplete();
      unsubFail();
      socketService.unsubscribeFromJob(jobId);
    };
  }, [jobId]);

  const handleCancel = async () => {
    try {
      const socketService = getSocketService();
      await socketService.cancelJob(jobId);
      setStatus(prev => ({ ...prev, state: 'cancelled' }));
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Render status icon
  const renderStatusIcon = () => {
    switch (status.state) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Render status text
  const renderStatusText = () => {
    if (!status.isOnline && status.state === 'running') {
      return 'Reconnecting to server...';
    }

    switch (status.state) {
      case 'running':
        return status.progress?.message || 'Processing...';
      case 'completed':
        return 'Completed successfully';
      case 'failed':
        return getHumanReadableError(status.error);
      case 'cancelled':
        return 'Cancelled by user';
    }
  };

  // Render online/offline badge
  const renderSourceBadge = () => {
    if (status.isOnline) {
      return (
        <div className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          <Wifi className="h-3 w-3" />
          Online
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
          <WifiOff className="h-3 w-3" />
          Offline
        </div>
      );
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg border border-gray-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {renderStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900">AI Task</h3>
            <p className="text-xs text-gray-500">Job ID: {jobId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderSourceBadge()}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 transition-colors hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {status.lastCheckpoint && (
          <div className="mb-3 text-xs text-gray-500">
            Last checkpoint at seq {status.lastCheckpoint.sequence}
          </div>
        )}

        {status.lastCheckpoint && status.state === 'failed' && onRetry && (
          <div className="mb-4">
            <button
              onClick={handleRetry}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Retry from checkpoint
            </button>
          </div>
        )}

        {/* Status message */}
        <div className="mb-4">
          <p className="text-sm text-gray-700">{renderStatusText()}</p>
        </div>

        {/* Progress bar */}
        {status.progress && status.state === 'running' && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-gray-600">
              <span>
                {status.progress.current} / {status.progress.total}
              </span>
              <span>{Math.round(status.progress.percentage)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${status.progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Streaming preview */}
        {status.chunks.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto rounded bg-gray-50 p-3 font-mono text-sm text-gray-700">
            {status.chunks.map((chunk, i) => (
              <span key={i}>{chunk}</span>
            ))}
          </div>
        )}

        {/* Error message */}
        {status.error && status.state === 'failed' && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{getHumanReadableError(status.error)}</p>
          </div>
        )}

        {/* Result preview */}
        {status.result && status.state === 'completed' && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">Task completed successfully</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status.state === 'running' && (
            <button
              onClick={handleCancel}
              className="flex-1 rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancel
            </button>
          )}

          {status.state === 'failed' && onRetry && (
            <button
              onClick={handleRetry}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Retry
            </button>
          )}

          {(status.state === 'completed' || status.state === 'cancelled') && (
            <button
              onClick={onClose}
              className="flex-1 rounded bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Convert technical errors to human-readable messages
 */
function getHumanReadableError(error?: string): string {
  if (!error) return 'Something went wrong. Please try again.';

  // Map common errors to friendly messages
  const errorMap: Record<string, string> = {
    'Connection timeout': 'Lost connection to server. Please check your internet and try again.',
    'Authentication failed': 'Your session expired. Please sign in again.',
    'Job cancelled': 'Task was cancelled.',
    'Job exceeded maximum runtime':
      'Task took too long and was stopped. Please try a smaller request.',
    'Worker crashed': 'Server error occurred. Our team has been notified.',
    'Redis connection failed': 'Service temporarily unavailable. Please try again in a moment.',
    'Invalid input': 'The request format was invalid. Please check your input.',
    'Rate limit exceeded': 'Too many requests. Please wait a moment and try again.',
  };

  // Check for known error patterns
  for (const [pattern, message] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(pattern.toLowerCase())) {
      return message;
    }
  }

  // Generic fallback (hide technical details)
  return 'Task failed. Please try again or contact support if the issue persists.';
}

/**
 * Mini floating job indicator (collapsed state)
 */
export function JobStatusMini({ jobId, onClick }: { jobId: string; onClick: () => void }) {
  const [isOnline, setIsOnline] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const socketService = getSocketService();

    const unsubStatus = socketService.onStatusChange(status => {
      setIsOnline(status === 'online');
    });

    const unsubProgress = socketService.onJobProgress(jobId, data => {
      setProgress(data.payload.progress?.percentage || 0);
    });

    return () => {
      unsubStatus();
      unsubProgress();
    };
  }, [jobId]);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700"
    >
      {isOnline ? <Loader2 className="h-6 w-6 animate-spin" /> : <WifiOff className="h-6 w-6" />}
      {progress > 0 && (
        <div className="absolute inset-0 rounded-full">
          <svg className="h-full w-full -rotate-90 transform">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="white"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
