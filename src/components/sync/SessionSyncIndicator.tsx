/**
 * Session Sync Indicator Component
 * Shows per-session cursor state, sync status, and last sync timestamp
 * Fixes multi-tab cursor UI bug
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { useSessionSync } from '../../hooks/useSessionSync';
import { formatDistanceToNow } from 'date-fns';

interface SessionSyncIndicatorProps {
  className?: string;
  showSessionId?: boolean;
  compact?: boolean;
}

export function SessionSyncIndicator({
  className = '',
  showSessionId = true,
  compact = false,
}: SessionSyncIndicatorProps) {
  const { sessionId, isSynced, lastSyncTime, syncError, retrySync } = useSessionSync();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retrySync();
    } finally {
      setIsRetrying(false);
    }
  };

  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  if (compact) {
    return (
      <div
        className={`session-sync-indicator-compact flex items-center gap-2 ${className}`}
        role="status"
        aria-live="polite"
      >
        {isSynced ? (
          <CheckCircle2 size={14} className="text-green-400" aria-label="Synced" />
        ) : (
          <AlertCircle size={14} className="text-red-400" aria-label="Sync failed" />
        )}
        {lastSyncTime && (
          <span className="text-xs text-slate-400">{formatRelativeTime(lastSyncTime)}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`session-sync-indicator rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Sync Status */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSynced ? (
            <>
              <CheckCircle2 size={16} className="text-green-400" aria-label="Synced" />
              <span className="text-sm font-medium text-green-100">Synced</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="text-red-400" aria-label="Sync failed" />
              <span className="text-sm font-medium text-red-100">Sync failed</span>
            </>
          )}
        </div>

        {!isSynced && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-1 rounded border border-red-500/40 bg-red-500/20 px-2 py-1 text-xs text-red-100 transition-colors hover:bg-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
            aria-label="Retry sync"
          >
            <RefreshCw size={12} className={isRetrying ? 'animate-spin' : ''} />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Last Sync Time */}
      {lastSyncTime && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
          <Clock size={12} />
          <span>Last sync: {formatRelativeTime(lastSyncTime)}</span>
          <span className="text-slate-500">({lastSyncTime.toLocaleTimeString()})</span>
        </div>
      )}

      {/* Session ID */}
      {showSessionId && (
        <div className="font-mono text-xs text-slate-500">Session: {sessionId.slice(0, 8)}...</div>
      )}

      {/* Error Message */}
      {syncError && !isSynced && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
          <AlertCircle size={12} />
          <span>{syncError}</span>
        </div>
      )}
    </div>
  );
}
