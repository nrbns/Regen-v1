/**
 * Automation Log Component - BATTLE 5
 * 
 * Transparency logs for automation rules.
 * Shows what happened, when, and why.
 * Visible, temporary, cancelable.
 */

import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { eventBus } from '../../core/state/eventBus';

interface LogEntry {
  id: string;
  timestamp: number;
  ruleId: string;
  ruleName: string;
  event: string;
  action: string;
  status: 'executing' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

/**
 * Automation Log Component
 * BATTLE 5: Transparency logs - shows what happened, when, why
 */
export function AutomationLog({ maxEntries = 10 }: { maxEntries?: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Listen for automation events
    const unsubscribeExecuting = eventBus.on('automation:rule:executing', (data: {
      ruleId: string;
      ruleName: string;
      executionId: string;
    }) => {
      setLogs(prev => [{
        id: data.executionId,
        timestamp: Date.now(),
        ruleId: data.ruleId,
        ruleName: data.ruleName,
        event: 'rule:executing',
        action: 'executing',
        status: 'executing',
      }, ...prev].slice(0, maxEntries));
    });

    const unsubscribeCompleted = eventBus.on('automation:rule:completed', (data: {
      ruleId: string;
      ruleName: string;
      executionId: string;
    }) => {
      setLogs(prev => prev.map(log =>
        log.id === data.executionId
          ? { ...log, status: 'completed' as const }
          : log
      ));
    });

    const unsubscribeFailed = eventBus.on('automation:rule:failed', (data: {
      ruleId: string;
      ruleName: string;
      executionId: string;
      error: string;
    }) => {
      setLogs(prev => prev.map(log =>
        log.id === data.executionId
          ? { ...log, status: 'failed' as const, error: data.error }
          : log
      ));
    });

    const unsubscribeCancelled = eventBus.on('automation:rule:cancelled', (data: {
      ruleId: string;
      executionId: string;
    }) => {
      setLogs(prev => prev.map(log =>
        log.id === data.executionId
          ? { ...log, status: 'cancelled' as const }
          : log
      ));
    });

    return () => {
      unsubscribeExecuting();
      unsubscribeCompleted();
      unsubscribeFailed();
      unsubscribeCancelled();
    };
  }, [maxEntries]);

  if (logs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'executing':
        return <Clock className="h-3 w-3 text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-400" />;
      case 'cancelled':
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: LogEntry['status']) => {
    switch (status) {
      case 'executing':
        return 'Executing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-lg p-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
          Automation Log
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.map(log => (
            <div
              key={log.id}
              className="flex items-start gap-2 text-xs"
            >
              {getStatusIcon(log.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    {log.ruleName}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {getStatusText(log.status)}
                  </span>
                </div>
                <div className="text-[var(--text-muted)] mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                {log.error && (
                  <div className="text-red-400 mt-1 text-[10px]">
                    {log.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
