/**
 * Sync Status Indicator Component
 * Shows sync status and allows manual sync trigger
 */

import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../hooks/useMobileDetection';

interface SyncStatusIndicatorProps {
  status: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: number | null;
    lastSyncError: string | null;
    pendingChanges: number;
    conflictCount: number;
  };
  onSync?: () => Promise<void>;
  className?: string;
}

export function SyncStatusIndicator({ status, onSync, className }: SyncStatusIndicatorProps) {
  const { isMobile } = useMobileDetection();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync || isManualSyncing || !status.isOnline) return;

    setIsManualSyncing(true);
    try {
      await onSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Don't show on desktop
  if (!isMobile) return null;

  const hasError = !!status.lastSyncError;
  const hasConflicts = status.conflictCount > 0;
  const hasPendingChanges = status.pendingChanges > 0;
  const isSyncing = status.isSyncing || isManualSyncing;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status Icon */}
      {!status.isOnline ? (
        <CloudOff className="w-4 h-4 text-gray-500" />
      ) : hasError ? (
        <AlertCircle className="w-4 h-4 text-red-400" />
      ) : hasConflicts ? (
        <AlertCircle className="w-4 h-4 text-yellow-400" />
      ) : (
        <Cloud className={cn('w-4 h-4', status.isOnline ? 'text-green-400' : 'text-gray-500')} />
      )}

      {/* Status Text */}
      <div className="flex flex-col">
        {status.isOnline ? (
          <>
            <span className="text-xs text-gray-400">
              {isSyncing ? 'Syncing...' : formatLastSync(status.lastSyncTime)}
            </span>
            {(hasPendingChanges || hasConflicts) && (
              <span className="text-xs text-yellow-400">
                {hasConflicts ? `${status.conflictCount} conflicts` : `${status.pendingChanges} pending`}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-500">Offline</span>
        )}
      </div>

      {/* Sync Button */}
      {status.isOnline && onSync && (
        <button
          onClick={handleSync}
          disabled={isSyncing || !status.isOnline}
          className={cn(
            'p-1.5 rounded-md transition-colors touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center',
            isSyncing
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          )}
          aria-label="Sync now"
        >
          <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}

