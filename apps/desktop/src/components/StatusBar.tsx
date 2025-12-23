/**
 * StatusBar Component
 * Global status indicator showing:
 * - Connection status
 * - Current active job
 * - Progress percentage
 * - Online/Offline mode
 */

import React, { useEffect, useState } from 'react';
import { getSocketClient } from '../services/socket';
import { useJobProgress } from '../hooks/useJobProgress';
import { useTabManager } from '../hooks/useTabManager';

interface StatusBarProps {
  currentJobId?: string | null;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ currentJobId, className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    'disconnected'
  );
  const [retryCount, setRetryCount] = useState(0);

  // Fallback to TabManager-provided active job id for session restore / tab isolation
  const { activeJobId } = useTabManager();
  const effectiveJobId = currentJobId ?? activeJobId ?? null;

  const { state: jobState, isStreaming } = useJobProgress(effectiveJobId || null);

  // Monitor socket connection
  useEffect(() => {
    try {
      const socket = getSocketClient();

      const unsubscribe = socket.on('socket:connected', () => {
        setSocketStatus('connected');
      });

      const unsubscribe2 = socket.on('socket:disconnected', () => {
        setSocketStatus('disconnected');
      });

      const unsubscribe3 = socket.on('socket:reconnecting', (data: any) => {
        setSocketStatus('connecting');
        setRetryCount(data.attempt);
      });

      // Initial status
      if (socket.isReady()) {
        setSocketStatus('connected');
      }

      return () => {
        unsubscribe?.();
        unsubscribe2?.();
        unsubscribe3?.();
      };
    } catch {
      // Socket not initialized yet
    }
  }, []);

  // Monitor online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = () => {
    if (!isOnline) {
      return '📡'; // Offline
    }
    if (socketStatus === 'connected') {
      return '🟢'; // Connected
    }
    if (socketStatus === 'connecting') {
      return '🟡'; // Reconnecting
    }
    return '🔴'; // Disconnected
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline Mode';
    }
    if (socketStatus === 'connecting') {
      return `Reconnecting... (${retryCount})`;
    }
    if (socketStatus === 'connected') {
      return 'Online';
    }
    return 'Offline (No Connection)';
  };

  const getJobStatus = () => {
    if (!jobState) {
      return null;
    }

    return `${jobState.step} (${jobState.progress}%)`;
  };

  return (
    <div
      className={`flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white ${className}`}
    >
      {/* Left: Connection Status */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-medium">{getStatusText()}</span>

        {/* Socket Mode */}
        {isOnline && socketStatus === 'connected' && (
          <span className="ml-2 text-xs text-slate-400">Socket.IO Active</span>
        )}
        {(!isOnline || socketStatus !== 'connected') && (
          <span className="ml-2 text-xs text-amber-200">Actions queue until reconnect</span>
        )}
      </div>

      {/* Center: Current Job */}
      {jobState && (
        <div className="ml-4 mr-4 flex flex-1 items-center gap-3">
          {/* Progress Bar */}
          <div className="max-w-xs flex-1">
            <div className="h-2 w-full rounded-full bg-slate-700">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${jobState.progress}%` }}
              />
            </div>
          </div>

          {/* Status Text */}
          <span className="whitespace-nowrap text-xs text-slate-300">{getJobStatus()}</span>

          {/* Streaming Indicator */}
          {isStreaming && <span className="animate-pulse">▌</span>}
        </div>
      )}

      {/* Right: Error or Additional Info */}
      <div className="ml-auto flex items-center gap-2">
        {jobState?.isFailed && <span className="text-xs text-red-400">❌ Error</span>}
        {jobState?.isComplete && <span className="text-xs text-green-400">✓ Complete</span>}

        {/* Network Info */}
        {!isOnline && <span className="ml-2 text-xs text-yellow-400">No Connection</span>}
      </div>
    </div>
  );
};

export default StatusBar;
