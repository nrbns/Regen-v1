/**
 * Action History Panel - Shows a history of agent actions for review and debugging
 */

import { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { executeAgentActions } from '../../services/agenticActions';
import { toast } from '../../utils/toast';

interface ActionLogEntry {
  timestamp: string;
  action: string;
  success: boolean;
  error?: string;
}

export interface ActionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ActionHistoryPanel({ open, onClose }: ActionHistoryPanelProps) {
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Load logs from localStorage
    const loadLogs = () => {
      try {
        const key = 'regen:agent-actions-log';
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setLogs(Array.isArray(parsed) ? parsed : []);
        }
      } catch {
        setLogs([]);
      }
    };

    loadLogs();

    // Listen for new actions
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'regen:agent-actions-log') {
        loadLogs();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for changes (since storage event only fires in other tabs)
    const interval = setInterval(loadLogs, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [open]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'success') return log.success;
    if (filter === 'failed') return !log.success;
    return true;
  });

  const getActionIcon = (action: string) => {
    const upper = action.toUpperCase();
    if (upper.includes('OPEN') || upper.includes('NAVIGATE')) return ExternalLink;
    if (upper.includes('SCRAPE')) return Search;
    if (upper.includes('SEARCH')) return Search;
    if (upper.includes('TRADE')) return ArrowRight;
    if (upper.includes('SUMMARIZE')) return RefreshCw;
    return Clock;
  };

  const getActionType = (action: string): string => {
    const match = action.match(/\[(\w+)/);
    return match?.[1] || 'UNKNOWN';
  };

  const handleRetry = async (action: string) => {
    if (retrying === action) return;

    setRetrying(action);
    toast.info('Retrying action...');

    try {
      const results = await executeAgentActions([action]);
      const result = results[0];

      if (result?.success) {
        toast.success('Action retried successfully');
        // Reload logs to show updated status
        const key = 'regen:agent-actions-log';
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          setLogs(Array.isArray(parsed) ? parsed : []);
        }
      } else {
        toast.error(`Retry failed: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(`Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRetrying(null);
    }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed bottom-20 right-4 z-50 w-96 rounded-2xl border border-slate-700/50 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-lg"
    >
      <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-100">Action History</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-700/50 px-4 py-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({logs.length})
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            filter === 'success'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Success ({logs.filter(l => l.success).length})
        </button>
        <button
          onClick={() => setFilter('failed')}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            filter === 'failed'
              ? 'bg-red-500/20 text-red-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Failed ({logs.filter(l => !l.success).length})
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto p-2">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No actions yet. Start using voice commands to see action history.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredLogs.map((log, idx) => {
                const Icon = getActionIcon(log.action);
                const actionType = getActionType(log.action);
                const timeAgo = formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });

                return (
                  <motion.div
                    key={`${log.timestamp}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`rounded-lg border px-3 py-2.5 text-xs ${
                      log.success
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 flex-shrink-0 ${
                          log.success ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {log.success ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-200">{actionType}</span>
                          <span className="text-[10px] text-slate-500">{timeAgo}</span>
                        </div>
                        <div className="mb-1 truncate font-mono text-[10px] text-slate-300">
                          {log.action}
                        </div>
                        {log.error && (
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <div className="flex-1 text-[10px] text-red-300">{log.error}</div>
                            <button
                              onClick={() => handleRetry(log.action)}
                              disabled={retrying === log.action}
                              className="flex items-center gap-1 rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-300 transition-colors hover:bg-slate-600/50 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Retry this action"
                            >
                              <RefreshCw
                                className={`h-2.5 w-2.5 ${retrying === log.action ? 'animate-spin' : ''}`}
                              />
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="border-t border-slate-700/50 px-4 py-2">
          <button
            onClick={() => {
              if (confirm('Clear all action history?')) {
                localStorage.removeItem('regen:agent-actions-log');
                setLogs([]);
              }
            }}
            className="text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            Clear History
          </button>
        </div>
      )}
    </motion.div>
  );
}
