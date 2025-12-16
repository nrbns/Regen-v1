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
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
          <Wifi className="w-3 h-3" />
          Online
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
          <WifiOff className="w-3 h-3" />
          Offline
        </div>
      );
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Status message */}
        <div className="mb-4">
          <p className="text-sm text-gray-700">{renderStatusText()}</p>
        </div>

        {/* Progress bar */}
        {status.progress && status.state === 'running' && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>
                {status.progress.current} / {status.progress.total}
              </span>
              <span>{Math.round(status.progress.percentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Streaming preview */}
        {status.chunks.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto bg-gray-50 rounded p-3 text-sm text-gray-700 font-mono">
            {status.chunks.map((chunk, i) => (
              <span key={i}>{chunk}</span>
            ))}
          </div>
        )}

        {/* Error message */}
        {status.error && status.state === 'failed' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">{getHumanReadableError(status.error)}</p>
          </div>
        )}

        {/* Result preview */}
        {status.result && status.state === 'completed' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">Task completed successfully</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status.state === 'running' && (
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors text-sm"
            >
              Cancel
            </button>
          )}

          {status.state === 'failed' && onRetry && (
            <button
              onClick={handleRetry}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors text-sm"
            >
              Retry
            </button>
          )}

          {(status.state === 'completed' || status.state === 'cancelled') && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors text-sm"
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
    'Job exceeded maximum runtime': 'Task took too long and was stopped. Please try a smaller request.',
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
      className="fixed bottom-4 right-4 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50"
    >
      {isOnline ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <WifiOff className="w-6 h-6" />
      )}
      {progress > 0 && (
        <div className="absolute inset-0 rounded-full">
          <svg className="w-full h-full transform -rotate-90">
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
