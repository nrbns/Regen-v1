/**
 * Multi-Tab Sync Indicator Component
 * Shows sync status across multiple tabs and handles conflicts
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSessionSync } from '../../hooks/useSessionSync';

interface TabSyncStatus {
  tabId: string;
  sessionId: string;
  isSynced: boolean;
  lastSyncTime: Date | null;
}

interface MultiTabSyncIndicatorProps {
  className?: string;
}

export function MultiTabSyncIndicator({ className = '' }: MultiTabSyncIndicatorProps) {
  const { sessionId, isSynced, lastSyncTime, retrySync } = useSessionSync();
  const [tabs, setTabs] = useState<TabSyncStatus[]>([]);
  const [conflictCount, setConflictCount] = useState(0);

  // Listen for sync events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'regenbrowser_sync_status') {
        try {
          const status = JSON.parse(e.newValue || '{}');
          setTabs(prev => {
            const existing = prev.find(t => t.tabId === status.tabId);
            if (existing) {
              return prev.map(t =>
                t.tabId === status.tabId
                  ? {
                      ...t,
                      isSynced: status.isSynced,
                      lastSyncTime: status.lastSyncTime ? new Date(status.lastSyncTime) : null,
                    }
                  : t
              );
            }
            return [...prev, status];
          });
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Broadcast our status
    const broadcastStatus = () => {
      const status: TabSyncStatus = {
        tabId: `tab-${Date.now()}`,
        sessionId,
        isSynced,
        lastSyncTime,
      };
      localStorage.setItem('regenbrowser_sync_status', JSON.stringify(status));
    };

    broadcastStatus();
    const interval = setInterval(broadcastStatus, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [sessionId, isSynced, lastSyncTime]);

  // Detect conflicts (different session IDs)
  useEffect(() => {
    const conflicts = tabs.filter(t => t.sessionId !== sessionId);
    setConflictCount(conflicts.length);
  }, [tabs, sessionId]);

  const allSynced = tabs.length > 0 && tabs.every(t => t.isSynced);
  const hasConflicts = conflictCount > 0;

  return (
    <div
      className={`multi-tab-sync-indicator rounded-lg border border-slate-700/60 bg-slate-800/50 p-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-200">Multi-Tab Sync</span>
        </div>
        {hasConflicts && (
          <span className="rounded border border-yellow-500/40 bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-100">
            {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        {allSynced ? (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle2 size={12} />
            <span>All tabs synced</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertCircle size={12} />
            <span>Some tabs not synced</span>
          </div>
        )}

        {/* Tab List */}
        {tabs.length > 0 && (
          <div className="space-y-1">
            {tabs.map(tab => (
              <div key={tab.tabId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {tab.isSynced ? (
                    <CheckCircle2 size={10} className="text-green-400" />
                  ) : (
                    <AlertCircle size={10} className="text-red-400" />
                  )}
                  <span className="text-slate-400">
                    {tab.tabId === `tab-${Date.now()}` ? 'This tab' : tab.tabId.slice(0, 8)}
                  </span>
                  {tab.sessionId !== sessionId && (
                    <span className="text-[10px] text-yellow-400">(different session)</span>
                  )}
                </div>
                {tab.lastSyncTime && (
                  <span className="text-[10px] text-slate-500">
                    {formatDistanceToNow(tab.lastSyncTime, { addSuffix: true })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Retry Button */}
        {!allSynced && (
          <button
            onClick={retrySync}
            className="flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/20 px-2 py-1 text-xs text-blue-100 transition-colors hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            aria-label="Retry sync for all tabs"
          >
            <RefreshCw size={12} />
            <span>Sync All Tabs</span>
          </button>
        )}
      </div>
    </div>
  );
}
