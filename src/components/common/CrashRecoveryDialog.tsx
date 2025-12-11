/**
 * Crash Recovery Dialog
 * Shows when a tab crashes and offers recovery options
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, X, RefreshCw } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents } from '../lib/ipc-events';

interface CrashRecoveryDialogProps {
  tabId: string;
  reason?: string;
  exitCode?: number;
  onClose: () => void;
  onReload: () => void;
}

export function CrashRecoveryDialog({
  tabId: _tabId,
  reason,
  exitCode,
  onClose,
  onReload,
}: CrashRecoveryDialogProps) {
  const [snapshots] = useState<Array<{ id: string; timestamp: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available snapshots
    const loadSnapshots = async () => {
      try {
        // Note: This would need to be added to IPC schema
        // const result = await ipc.performance.snapshotList();
        // setSnapshots(result.snapshots || []);
      } catch (error) {
        console.error('Failed to load snapshots:', error);
      }
    };
    loadSnapshots();
  }, []);

  const handleReload = () => {
    onReload();
    onClose();
  };

  const handleRestoreSnapshot = async (_snapshotId: string) => {
    setLoading(true);
    try {
      // Note: This would need to be added to IPC schema
      // await ipc.performance.snapshotRestore({ snapshotId });
      // Then restore tabs from snapshot
      onClose();
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={e => {
          // Close on backdrop click
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="rounded-2xl border border-red-500/40 bg-gray-900/95 backdrop-blur-xl shadow-2xl p-6 max-w-md w-full mx-4"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-500/20 p-3">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Tab Crashed</h3>
              <p className="text-sm text-gray-400 mb-4">
                This tab encountered an error and stopped responding.
                {reason && (
                  <span className="block mt-1 text-xs">
                    Reason: {reason}
                    {exitCode !== undefined && ` (Exit code: ${exitCode})`}
                  </span>
                )}
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handleReload();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-lg border border-blue-500/60 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  <RefreshCw size={16} />
                  Reload Tab
                </button>

                {snapshots.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Or restore from snapshot:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {snapshots.slice(0, 3).map(snapshot => (
                        <button
                          key={snapshot.id}
                          onClick={e => {
                            (e as any).stopImmediatePropagation();
                            e.stopPropagation();
                            handleRestoreSnapshot(snapshot.id);
                          }}
                          onMouseDown={e => {
                            (e as any).stopImmediatePropagation();
                            e.stopPropagation();
                          }}
                          disabled={loading}
                          className="w-full flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/60 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-700/60 disabled:opacity-50"
                          style={{ zIndex: 10011, isolation: 'isolate' }}
                        >
                          <span className="flex items-center gap-2">
                            <RotateCcw size={12} />
                            {new Date(snapshot.timestamp).toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    onClose();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  className="mt-2 rounded-lg border border-gray-700/60 bg-gray-800/60 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700/60"
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  Close
                </button>
              </div>
            </div>
            <button
              onClick={e => {
                (e as any).stopImmediatePropagation();
                e.stopPropagation();
                onClose();
              }}
              onMouseDown={e => {
                (e as any).stopImmediatePropagation();
                e.stopPropagation();
              }}
              className="rounded-lg p-1 text-gray-400 hover:text-gray-200 transition-colors"
              style={{ zIndex: 10011, isolation: 'isolate' }}
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage crash recovery dialog state
 */
export function useCrashRecovery() {
  const [crashedTab, setCrashedTab] = useState<{
    tabId: string;
    reason?: string;
    exitCode?: number;
  } | null>(null);

  useEffect(() => {
    const handleCrash = (data: { tabId: string; reason?: string; exitCode?: number }) => {
      setCrashedTab(data);
    };

    const unsubscribe = ipcEvents.on('tabs:crash-detected', handleCrash);
    return unsubscribe;
  }, []);

  const handleReload = async () => {
    if (!crashedTab) return;
    try {
      const tab = await ipc.tabs.list();
      const crashedTabData = tab.find((t: any) => t.id === crashedTab.tabId);
      if (crashedTabData) {
        await ipc.tabs.reload(crashedTab.tabId);
      } else {
        // Tab was removed, create new one
        await ipc.tabs.create('about:blank');
      }
    } catch (error) {
      console.error('Failed to reload crashed tab:', error);
    }
  };

  return {
    crashedTab,
    setCrashedTab,
    handleReload,
  };
}
